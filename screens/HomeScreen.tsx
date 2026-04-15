import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ZephaBody } from '@/components/ZephaBody';
import { ZephaDebugPanel } from '@/components/ZephaDebugPanel';
import { ZephaOffer } from '@/components/ZephaOffer';
import { OFFER_COOLDOWN_MS } from '@/lib/zepha/config';
import { buildZephaContext } from '@/lib/zepha/brain/buildContext';
import { decideZephaState } from '@/lib/zepha/brain/decideState';
import {
  createInitialMemory,
  noteUrgency,
  noteWorkIntent,
  reinforceMemory,
} from '@/lib/zepha/brain/memory';
import { scoreZephaConfidence } from '@/lib/zepha/brain/scoreConfidence';
import { VALID_TRANSITIONS, canLeaveState } from '@/lib/zepha/brain/transitions';
import { useZephaMotion } from '@/lib/zepha/motion/useZephaMotion';
import { useEffectEvent } from '@/lib/zepha/motion/animations';
import { useZephaSignals } from '@/lib/zepha/signals/useZephaSignals';
import { STATES } from '@/lib/zepha/states';
import type { OfferState, ZephaContext, ZephaSignals, ZephaState } from '@/lib/zepha/types';

const INITIAL_OFFER_STATE: OfferState = {
  visible: false,
  accepted: false,
  dismissed: false,
  label: 'notes',
};

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const motion = useZephaMotion({ width, height });

  const [trueState, setTrueState] = useState<ZephaState>(STATES.SLEEP);
  const [brainReason, setBrainReason] = useState('initial sleep');
  const [focusMode, setFocusMode] = useState(false);
  const [meetingSoon, setMeetingSoon] = useState(false);
  const [manualWorkIntent, setManualWorkIntent] = useState(false);
  const [manualUrgency, setManualUrgency] = useState(false);
  const [relevantPrepExists, setRelevantPrepExists] = useState(false);
  const [firstRunLearningMode, setFirstRunLearningMode] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [offerState, setOfferState] = useState<OfferState>(INITIAL_OFFER_STATE);

  const stateEnteredAt = useRef(Date.now());
  const trueStateRef = useRef<ZephaState>(STATES.SLEEP);
  const brainTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memoryRef = useRef(createInitialMemory());

  const { signals, markInteraction, lastInteractionAt } = useZephaSignals({
    focusMode,
    meetingSoon,
    manualWorkIntent,
    manualUrgency,
    relevantPrepExists,
    firstRunLearningMode,
  });

  const context = useMemo(() => buildZephaContext(signals), [signals]);
  const confidence = useMemo(
    () => scoreZephaConfidence(context, signals, memoryRef.current),
    [context, signals]
  );

  const updateTrueState = (
    nextState: ZephaState,
    reason: string,
    currentSignals: ZephaSignals,
    currentContext: ZephaContext
  ) => {
    const currentState = trueStateRef.current;

    if (nextState === currentState) {
      setBrainReason(reason);
      memoryRef.current.lastDecisionReason = reason;
      return;
    }

    if (!canLeaveState(currentState, nextState, stateEnteredAt.current, Date.now())) return;

    const dwellMs = Date.now() - stateEnteredAt.current;
    reinforceMemory(memoryRef.current, currentState, dwellMs, currentSignals, currentContext, reason);

    trueStateRef.current = nextState;
    setTrueState(nextState);
    stateEnteredAt.current = Date.now();
    setBrainReason(reason);
  };

  const showOffer = (label = 'notes') => {
    memoryRef.current.recentOfferAt = Date.now();
    setOfferState({ visible: true, accepted: false, dismissed: false, label });
    motion.showOfferAnimation();
  };

  const hideOffer = (dismissed = false) => {
    if (dismissed) {
      memoryRef.current.offerDismissedAt = Date.now();
    }

    motion.hideOfferAnimation(() => {
      setOfferState((prev) => ({
        ...prev,
        visible: false,
        dismissed,
        accepted: !dismissed && prev.accepted,
      }));
    });
  };

  useEffect(() => {
    trueStateRef.current = trueState;
  }, [trueState]);

  useEffect(() => {
    if (manualWorkIntent || meetingSoon || focusMode) {
      noteWorkIntent(memoryRef.current, Date.now());
    }
  }, [focusMode, manualWorkIntent, meetingSoon]);

  useEffect(() => {
    if (manualUrgency) {
      noteUrgency(memoryRef.current, Date.now());
    }
  }, [manualUrgency]);

  const syncOfferVisibility = useEffectEvent(() => {
    const canShowOffer =
      confidence.offer >= 0.45 &&
      context.offerIntentActive &&
      !offerState.visible &&
      (!memoryRef.current.offerDismissedAt ||
        Date.now() - memoryRef.current.offerDismissedAt > OFFER_COOLDOWN_MS);

    if (canShowOffer) {
      showOffer('prep');
    }

    const shouldHideOffer =
      offerState.visible && (!context.offerIntentActive || context.guardIntentActive);

    if (shouldHideOffer) {
      hideOffer(false);
    }
  });

  useEffect(() => {
    syncOfferVisibility();
  }, [
    confidence.offer,
    context.guardIntentActive,
    context.offerIntentActive,
    offerState.visible,
    syncOfferVisibility,
  ]);

  const runBrainTick = useEffectEvent(() => {
    const freshSignals: ZephaSignals = {
      ...signals,
      now: Date.now(),
    };

    const freshContext = buildZephaContext(freshSignals);
    const freshConfidence = scoreZephaConfidence(freshContext, freshSignals, memoryRef.current);
    const decision = decideZephaState(
      trueStateRef.current,
      freshSignals,
      freshContext,
      freshConfidence,
      offerState.visible
    );

    updateTrueState(decision.nextState, decision.reason, freshSignals, freshContext);
  });

  useEffect(() => {
    if (brainTickRef.current) {
      clearInterval(brainTickRef.current);
    }

    brainTickRef.current = setInterval(() => {
      runBrainTick();
    }, 2000);

    return () => {
      if (brainTickRef.current) clearInterval(brainTickRef.current);
    };
  }, [runBrainTick]);

  const syncVisibleTransition = useEffectEvent(() => {
    motion.runVisibleTransitionPlan({
      toTrueState: trueState,
      signals,
      context,
      confidence,
    });
  });

  useEffect(() => {
    syncVisibleTransition();
  }, [syncVisibleTransition, trueState, width, height]);

  const getCurrentSignals = () => ({ ...signals, now: Date.now() });

  return (
    <View
      style={styles.container}
      onTouchStart={() => {
        markInteraction();
      }}
    >
      <ZephaBody
        motion={{
          visibleState: motion.visibleState,
          showSilk: motion.showSilk,
          posX: motion.posX,
          posY: motion.posY,
          scale: motion.scale,
          idleFloat: motion.idleFloat,
          zzzOpacity: motion.zzzOpacity,
          webOpacity: motion.webOpacity,
          silkOpacity: motion.silkOpacity,
          blinkScaleY: motion.blinkScaleY,
          watchNudge: motion.watchNudge,
          curiousNudge: motion.curiousNudge,
          leftWallX: motion.leftWallX,
          topWallY: motion.topWallY,
        }}
        trueState={trueState}
        brainReason={brainReason}
        onPress={() => {
          markInteraction();
          const nextSignals = getCurrentSignals();
          const nextContext = buildZephaContext(nextSignals);

          if (motion.visibleState === STATES.SLEEP) {
            updateTrueState(STATES.LIGHT_WAKE, 'manual wake tap', nextSignals, nextContext);
          } else if (motion.visibleState === STATES.LIGHT_WAKE) {
            updateTrueState(STATES.WAKE, 'manual commit wake', nextSignals, nextContext);
          } else if (motion.visibleState === STATES.IDLE) {
            updateTrueState(STATES.CURIOUS, 'manual interaction from idle', nextSignals, nextContext);
          } else if (motion.visibleState === STATES.CURIOUS) {
            updateTrueState(STATES.GUARD, 'manual escalate to guard', nextSignals, nextContext);
          } else if (motion.visibleState === STATES.GUARD) {
            updateTrueState(STATES.WATCH, 'manual release guard', nextSignals, nextContext);
          } else if (motion.visibleState === STATES.WATCH) {
            updateTrueState(STATES.IDLE, 'manual settle to idle', nextSignals, nextContext);
          } else if (motion.visibleState === STATES.WAKE) {
            updateTrueState(STATES.GUARD, 'manual wake escalation', nextSignals, nextContext);
          }
        }}
      />

      <ZephaOffer
        offerState={offerState}
        offerAnchor={motion.offerAnchor}
        leftWallX={motion.leftWallX}
        topWallY={motion.topWallY}
        offerOpacity={motion.offerOpacity}
        offerScale={motion.offerScale}
        offerThreadOpacity={motion.offerThreadOpacity}
        onPress={() => {
          markInteraction();
          memoryRef.current.offerPrepBias = Math.max(
            0,
            Math.min(1, memoryRef.current.offerPrepBias + 0.05)
          );
          setOfferState((prev) => ({ ...prev, accepted: true, dismissed: false }));
          hideOffer(false);
        }}
        onLongPress={() => {
          markInteraction();
          hideOffer(true);
        }}
      />

      <ZephaDebugPanel
        showDebug={showDebug}
        signals={signals}
        context={context}
        confidence={confidence}
        offerState={offerState}
        memory={memoryRef.current}
        validExits={VALID_TRANSITIONS[trueState].join(' → ')}
        focusMode={focusMode}
        meetingSoon={meetingSoon}
        relevantPrepExists={relevantPrepExists}
        manualWorkIntent={manualWorkIntent}
        manualUrgency={manualUrgency}
        firstRunLearningMode={firstRunLearningMode}
        onToggleFocusMode={() => {
          markInteraction();
          setFocusMode((value) => !value);
        }}
        onToggleMeetingSoon={() => {
          markInteraction();
          setMeetingSoon((value) => !value);
        }}
        onToggleRelevantPrep={() => {
          markInteraction();
          setRelevantPrepExists((value) => !value);
        }}
        onToggleManualWorkIntent={() => {
          markInteraction();
          setManualWorkIntent((value) => !value);
        }}
        onToggleManualUrgency={() => {
          markInteraction();
          setManualUrgency((value) => !value);
        }}
        onToggleLearningMode={() => {
          setFirstRunLearningMode((value) => !value);
        }}
        onFakeIdle={() => {
          lastInteractionAt.current = Date.now() - 2 * 60 * 1000;
          setBrainReason('debug: forced inactivity');
        }}
        onSleep={() => {
          const nextSignals = getCurrentSignals();
          const nextContext = buildZephaContext(nextSignals);
          updateTrueState(STATES.SLEEP, 'manual sleep', nextSignals, nextContext);
        }}
        onResetMemory={() => {
          memoryRef.current = createInitialMemory();
          setOfferState(INITIAL_OFFER_STATE);
          motion.resetOfferVisuals();
          setBrainReason('memory reset');
        }}
        onToggleDebug={() => {
          setShowDebug((value) => !value);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081238',
  },
});