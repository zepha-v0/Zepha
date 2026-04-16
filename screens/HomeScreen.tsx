import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ZephaBody } from '@/components/ZephaBody';
import { ZephaDebugPanel } from '@/components/ZephaDebugPanel';
import { ZephaOffer } from '@/components/ZephaOffer';
import { buildZephaContext } from '@/lib/zepha/brain/buildContext';
import { decideZephaState } from '@/lib/zepha/brain/decideState';
import { OFFER_COOLDOWN_MS } from '@/lib/zepha/config';
import {
  createInitialMemory,
  noteUrgency,
  noteWorkIntent,
  reinforceMemory,
} from '@/lib/zepha/brain/memory';
import { scoreZephaConfidence } from '@/lib/zepha/brain/scoreConfidence';
import { VALID_TRANSITIONS, canLeaveState } from '@/lib/zepha/brain/transitions';
import { useZephaMotion } from '@/lib/zepha/motion/useZephaMotion';
import {
  clearStoredOffers,
  createStoredOffer,
  loadStoredOffers,
  updateStoredOfferStatus,
} from '@/lib/zepha/offers/storage';
import { useEffectEvent } from '@/lib/zepha/motion/animations';
import { useZephaSignals } from '@/lib/zepha/signals/useZephaSignals';
import { STATES } from '@/lib/zepha/states';
import type {
  OfferState,
  StoredOffer,
  ZephaContext,
  ZephaSignals,
  ZephaState,
} from '@/lib/zepha/types';

const INITIAL_OFFER_STATE: OfferState = {
  visible: false,
  activeOfferId: null,
  label: 'notes',
};

const SAMPLE_OFFER = {
  type: 'note' as const,
  title: 'Meeting notes',
  body: 'Review three points before 9:30',
  priority: 50,
  urgency: 'normal' as const,
};

const HIGH_PRIORITY_SAMPLE_OFFER = {
  type: 'note' as const,
  title: 'Boarding reminder',
  body: 'Gate closes in 15 minutes.',
  priority: 80,
  urgency: 'normal' as const,
};

const URGENT_SAMPLE_OFFER = {
  type: 'note' as const,
  title: 'Focus blocker',
  body: 'Critical prep needs attention now.',
  priority: 90,
  urgency: 'urgent' as const,
};

const AUTO_PREP_OFFER = {
  type: 'note' as const,
  title: 'Notes ready',
  body: 'Your notes from yesterday are here if you want them before the meeting.',
  priority: 70,
  urgency: 'normal' as const,
};
type DebugStateOverride =
  | 'sleep'
  | 'wake'
  | 'idle'
  | 'curious'
  | 'guard'
  | 'watch'
  | 'offer'
  | null;

type GlyphVariant = 'curious' | 'watch' | 'guard' | 'offer';

type ActiveGlyph = {
  id: string;
  symbol: string;
  variant: GlyphVariant;
};

const DEBUG_OVERRIDE_OFFER: StoredOffer = {
  id: 'debug-offer-override',
  type: 'note',
  title: 'Meeting notes',
  body: 'Review three points before 9:30',
  priority: 100,
  urgency: 'normal',
  createdAt: 0,
  status: 'pending',
  respondedAt: null,
};

function getExpectedVisibleStateForOverrideStep(step: ZephaState) {
  if (step === STATES.WAKE) {
    return STATES.IDLE;
  }

  return step;
}

function buildOverrideRoute(from: ZephaState, target: ZephaState) {
  if (from === target) {
    return [target];
  }

  if (from === STATES.SLEEP && target !== STATES.SLEEP) {
    if (target === STATES.WAKE) {
      return [STATES.WAKE];
    }

    if (target === STATES.IDLE) {
      return [STATES.WAKE, STATES.IDLE];
    }

    if (target === STATES.CURIOUS) {
      return [STATES.WAKE, STATES.IDLE, STATES.CURIOUS];
    }

    if (target === STATES.GUARD) {
      return [STATES.WAKE, STATES.IDLE, STATES.GUARD];
    }

    if (target === STATES.WATCH) {
      return [STATES.WAKE, STATES.IDLE, STATES.GUARD, STATES.WATCH];
    }
  }

  if (from === STATES.GUARD && target !== STATES.GUARD) {
    if (target === STATES.WATCH) {
      return [STATES.WATCH];
    }

    if (target === STATES.CURIOUS) {
      return [STATES.WATCH, STATES.CURIOUS];
    }

    if (target === STATES.IDLE) {
      return [STATES.WATCH, STATES.IDLE];
    }

    if (target === STATES.SLEEP) {
      return [STATES.WATCH, STATES.SLEEP];
    }

    if (target === STATES.WAKE) {
      return [STATES.WATCH, STATES.IDLE, STATES.WAKE];
    }
  }

  return [target];
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const motion = useZephaMotion({ width, height });

  const [trueState, setTrueState] = useState<ZephaState>(STATES.SLEEP);
  const [brainReason, setBrainReason] = useState('initial sleep');
  const [focusMode, setFocusMode] = useState(false);
  const [meetingSoon, setMeetingSoon] = useState(false);
  const [manualWorkIntent, setManualWorkIntent] = useState(false);
  const [manualGuard, setManualGuard] = useState(false);
  const [relevantPrepExists, setRelevantPrepExists] = useState(false);
  const [firstRunLearningMode, setFirstRunLearningMode] = useState(true);
  const [showDebug, setShowDebug] = useState(true);
  const [offerState, setOfferState] = useState<OfferState>(INITIAL_OFFER_STATE);
  const [storedOffers, setStoredOffers] = useState<StoredOffer[]>([]);
  const [stateOverride, setStateOverride] = useState<DebugStateOverride>(null);
  const [stateOverrideRoute, setStateOverrideRoute] = useState<ZephaState[]>([]);
  const [activeGlyph, setActiveGlyph] = useState<ActiveGlyph | null>(null);

  const stateEnteredAt = useRef(Date.now());
  const trueStateRef = useRef<ZephaState>(STATES.SLEEP);
  const brainTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memoryRef = useRef(createInitialMemory());
  const autoPrepOfferInFlightRef = useRef(false);
  const glyphShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glyphHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGlyphStateRef = useRef<ZephaState | null>(null);
  const lastGlyphOfferIdRef = useRef<string | null>(null);

  const { signals, markInteraction, lastInteractionAt } = useZephaSignals({
    focusMode,
    meetingSoon,
    manualWorkIntent,
    manualGuard,
    relevantPrepExists,
    firstRunLearningMode,
  });

  const context = useMemo(() => buildZephaContext(signals), [signals]);
  const confidence = useMemo(
    () => scoreZephaConfidence(context, signals, memoryRef.current),
    [context, signals]
  );
  const activeOverrideState = stateOverrideRoute[0] ?? null;
  const effectiveTrueState = useMemo<ZephaState>(() => {
    if (
      activeOverrideState === STATES.SLEEP ||
      activeOverrideState === STATES.WAKE ||
      activeOverrideState === STATES.IDLE ||
      activeOverrideState === STATES.CURIOUS ||
      activeOverrideState === STATES.GUARD ||
      activeOverrideState === STATES.WATCH
    ) {
      return activeOverrideState;
    }

    return trueState;
  }, [activeOverrideState, trueState]);
  const activeOffer = useMemo(
    () => {
      if (stateOverride === 'offer') {
        return DEBUG_OVERRIDE_OFFER;
      }

      if (effectiveTrueState === STATES.SLEEP) {
        return null;
      }

      const pendingOffers = storedOffers.filter((offer) => offer.status === 'pending');
      const visibleCandidates =
        effectiveTrueState === STATES.GUARD
          ? pendingOffers.filter((offer) => offer.urgency === 'urgent')
          : pendingOffers;

      return [...visibleCandidates].sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }

        return a.createdAt - b.createdAt;
      })[0] ?? null;
    },
    [effectiveTrueState, stateOverride, storedOffers]
  );

  const triggerGlyph = useEffectEvent((variant: GlyphVariant, symbol: string) => {
    if (glyphShowTimeoutRef.current) {
      clearTimeout(glyphShowTimeoutRef.current);
    }

    if (glyphHideTimeoutRef.current) {
      clearTimeout(glyphHideTimeoutRef.current);
    }

    setActiveGlyph(null);

    const showDelayMs =
      variant === 'guard' ? 100 : variant === 'offer' ? 140 : 120;
    const visibleDurationMs =
      variant === 'offer' ? 1650 : variant === 'watch' ? 1250 : variant === 'curious' ? 1150 : 950;
    const glyphId = `${variant}-${Date.now()}`;

    glyphShowTimeoutRef.current = setTimeout(() => {
      setActiveGlyph({
        id: glyphId,
        symbol,
        variant,
      });

      glyphHideTimeoutRef.current = setTimeout(() => {
        setActiveGlyph((current) => (current?.id === glyphId ? null : current));
      }, visibleDurationMs);
    }, showDelayMs);
  });

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

  const syncOfferCard = useEffectEvent((nextOffer: StoredOffer | null) => {
    if (nextOffer) {
      memoryRef.current.recentOfferAt = nextOffer.createdAt;
      setOfferState({
        visible: true,
        activeOfferId: nextOffer.id,
        label: nextOffer.type === 'note' ? 'notes' : nextOffer.type,
      });

      if (!offerState.visible || offerState.activeOfferId !== nextOffer.id) {
        motion.showOfferAnimation();
      }
      return;
    }

    if (!offerState.visible) return;

    motion.hideOfferAnimation(() => {
      setOfferState(INITIAL_OFFER_STATE);
    });
  });

  const refreshStoredOffers = useEffectEvent(async () => {
    const offers = await loadStoredOffers();
    setStoredOffers(offers);
  });

  const ensureAutomaticPrepOffer = useEffectEvent(async () => {
    if (autoPrepOfferInFlightRef.current) {
      return;
    }

    const hasExistingPrepOffer = storedOffers.some(
      (offer) =>
        offer.type === AUTO_PREP_OFFER.type &&
        offer.title === AUTO_PREP_OFFER.title &&
        offer.body === AUTO_PREP_OFFER.body
    );

    if (hasExistingPrepOffer) {
      return;
    }

    if (
      memoryRef.current.offerDismissedAt &&
      Date.now() - memoryRef.current.offerDismissedAt < OFFER_COOLDOWN_MS
    ) {
      return;
    }

    autoPrepOfferInFlightRef.current = true;

    try {
      const offers = await createStoredOffer(AUTO_PREP_OFFER);
      setStoredOffers(offers);
    } finally {
      autoPrepOfferInFlightRef.current = false;
    }
  });

  const spawnSampleOffer = useEffectEvent(async () => {
    markInteraction();
    const offers = await createStoredOffer(SAMPLE_OFFER);
    setStoredOffers(offers);
  });

  const spawnPriorityOffer = useEffectEvent(async () => {
    markInteraction();
    const offers = await createStoredOffer(HIGH_PRIORITY_SAMPLE_OFFER);
    setStoredOffers(offers);
  });

  const spawnUrgentOffer = useEffectEvent(async () => {
    markInteraction();
    const offers = await createStoredOffer(URGENT_SAMPLE_OFFER);
    setStoredOffers(offers);
  });

  const respondToOffer = useEffectEvent(async (status: 'accepted' | 'declined') => {
    if (!activeOffer) return;

    markInteraction();

    if (status === 'accepted') {
      memoryRef.current.offerPrepBias = Math.max(
        0,
        Math.min(1, memoryRef.current.offerPrepBias + 0.05)
      );
    } else {
      memoryRef.current.offerDismissedAt = Date.now();
    }

    const offers = await updateStoredOfferStatus(activeOffer.id, status);
    setStoredOffers(offers);
  });

  const clearOfferTestData = useEffectEvent(async () => {
    markInteraction();
    const offers = await clearStoredOffers();
    setStoredOffers(offers);
    motion.resetOfferVisuals();
    setOfferState(INITIAL_OFFER_STATE);
  });

  useEffect(() => {
    trueStateRef.current = trueState;
  }, [trueState]);

  useEffect(() => {
    if (manualWorkIntent || meetingSoon || focusMode) {
      noteWorkIntent(memoryRef.current, Date.now());
    }
  }, [focusMode, manualWorkIntent, meetingSoon]);

  useEffect(() => {
    if (manualGuard) {
      noteUrgency(memoryRef.current, Date.now());
    }
  }, [manualGuard]);

  useEffect(() => {
    refreshStoredOffers();
  }, [refreshStoredOffers]);

  useEffect(() => {
    if (!context.offerIntentActive || confidence.offer < 0.45) {
      return;
    }

    ensureAutomaticPrepOffer();
  }, [confidence.offer, context.offerIntentActive, ensureAutomaticPrepOffer]);

  useEffect(() => {
    const glyphState = effectiveTrueState;
    if (lastGlyphStateRef.current === glyphState) {
      return;
    }

    lastGlyphStateRef.current = glyphState;

    if (glyphState === STATES.CURIOUS) {
      triggerGlyph('curious', '?');
      return;
    }

    if (glyphState === STATES.WATCH) {
      triggerGlyph('watch', 'oo');
      return;
    }

    if (glyphState === STATES.GUARD) {
      triggerGlyph('guard', '●');
      return;
    }
  }, [effectiveTrueState, triggerGlyph]);

  useEffect(() => {
    const nextOfferId = activeOffer?.id ?? null;
    if (lastGlyphOfferIdRef.current === nextOfferId) {
      return;
    }

    lastGlyphOfferIdRef.current = nextOfferId;

    if (nextOfferId) {
      triggerGlyph('offer', '✧');
    }
  }, [activeOffer?.id, triggerGlyph]);

  useEffect(() => {
    syncOfferCard(activeOffer);
  }, [activeOffer, syncOfferCard]);

  useEffect(() => {
    return () => {
      if (glyphShowTimeoutRef.current) {
        clearTimeout(glyphShowTimeoutRef.current);
      }

      if (glyphHideTimeoutRef.current) {
        clearTimeout(glyphHideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeOverrideState || stateOverrideRoute.length <= 1) {
      return;
    }

    const expectedVisibleState = getExpectedVisibleStateForOverrideStep(activeOverrideState);
    if (motion.visibleState !== expectedVisibleState) {
      return;
    }

    setStateOverrideRoute((currentRoute) => currentRoute.slice(1));
  }, [activeOverrideState, motion.visibleState, stateOverrideRoute.length]);

  const runBrainTick = useEffectEvent(() => {
    if (stateOverride) {
      return;
    }

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
      !!activeOffer
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
      toTrueState: effectiveTrueState,
      signals,
      context,
      confidence,
    });
  });

  useEffect(() => {
    syncVisibleTransition();
  }, [effectiveTrueState, syncVisibleTransition, width, height]);

  const getCurrentSignals = () => ({ ...signals, now: Date.now() });
  const runImmediateBrainEvaluation = useEffectEvent(() => {
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
      !!activeOffer
    );

    updateTrueState(decision.nextState, decision.reason, freshSignals, freshContext);
  });

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
        trueState={effectiveTrueState}
        brainReason={brainReason}
        glyphSignal={activeGlyph}
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
        offer={activeOffer}
        offerAnchor={motion.offerAnchor}
        leftWallX={motion.leftWallX}
        topWallY={motion.topWallY}
        offerOpacity={motion.offerOpacity}
        offerScale={motion.offerScale}
        offerThreadOpacity={motion.offerThreadOpacity}
        onAccept={() => {
          respondToOffer('accepted');
        }}
        onDecline={() => {
          respondToOffer('declined');
        }}
      />

      <ZephaDebugPanel
        showDebug={showDebug}
        signals={signals}
        context={context}
        confidence={confidence}
        offerState={offerState}
        storedOffers={storedOffers}
        memory={memoryRef.current}
        validExits={VALID_TRANSITIONS[effectiveTrueState]?.join(' → ') ?? 'override'}
        focusMode={focusMode}
        meetingSoon={meetingSoon}
        relevantPrepExists={relevantPrepExists}
        manualWorkIntent={manualWorkIntent}
        manualGuard={manualGuard}
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
        onToggleManualGuard={() => {
          markInteraction();
          setManualGuard((value) => !value);
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
        onSpawnSampleOffer={() => {
          spawnSampleOffer();
        }}
        onSpawnPriorityOffer={() => {
          spawnPriorityOffer();
        }}
        onSpawnUrgentOffer={() => {
          spawnUrgentOffer();
        }}
        onClearOffers={() => {
          clearOfferTestData();
        }}
        onResetMemory={() => {
          memoryRef.current = createInitialMemory();
          motion.resetOfferVisuals();
          setBrainReason('memory reset');
        }}
        onToggleDebug={() => {
          setShowDebug((value) => !value);
        }}
        stateOverride={stateOverride}
        onClearStateOverride={() => {
          setStateOverride(null);
          setStateOverrideRoute([]);
          runImmediateBrainEvaluation();
        }}
        onSetStateOverride={(value) => {
          markInteraction();
          setStateOverride(value);

          if (value === 'offer') {
            setStateOverrideRoute([]);
            return;
          }

          setStateOverrideRoute(buildOverrideRoute(effectiveTrueState, value));
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
