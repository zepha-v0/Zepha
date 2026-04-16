import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { STATE_CONFIG } from '../config';
import { buildVisibleTransitionPlan } from '../brain/transitions';
import { STATES } from '../states';
import type {
  RunVisibleTransitionArgs,
  VisibleTransitionStep,
  ZephaState,
} from '../types';
import { animateXY, stopAnimatedValues, stopLoop, useEffectEvent } from './animations';
import { buildZephaPositions } from './positions';

const CALM_EASING = Easing.bezier(0.22, 0, 0.18, 1);
const DRIFT_EASING = Easing.bezier(0.3, 0, 0.18, 1);

export function useZephaMotion(params: { width: number; height: number }) {
  const positions = useMemo(
    () => buildZephaPositions(params.width, params.height),
    [params.height, params.width]
  );

  const [visibleState, setVisibleState] = useState<ZephaState>(STATES.SLEEP);
  const [showSilk, setShowSilk] = useState(false);

  const visibleStateRef = useRef<ZephaState>(STATES.SLEEP);
  const activeAnimationId = useRef(0);

  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const posXRef = useRef(0);
  const posYRef = useRef(0);
  const scale = useRef(new Animated.Value(1)).current;
  const idleFloat = useRef(new Animated.Value(0)).current;
  const zzzOpacity = useRef(new Animated.Value(1)).current;
  const webOpacity = useRef(new Animated.Value(1)).current;
  const silkOpacity = useRef(new Animated.Value(0)).current;
  const blinkScaleY = useRef(new Animated.Value(1)).current;
  const watchNudge = useRef(new Animated.Value(0)).current;
  const curiousNudge = useRef(new Animated.Value(0)).current;

  const offerOpacity = useRef(new Animated.Value(0)).current;
  const offerScale = useRef(new Animated.Value(0.92)).current;
  const offerThreadOpacity = useRef(new Animated.Value(0)).current;

  const wanderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathingLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const idleFloatLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const watchLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const curiousLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const lightWakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAnimationCurrent = (id: number) => activeAnimationId.current === id;

  const nextAnimationId = () => {
    activeAnimationId.current += 1;
    return activeAnimationId.current;
  };

  const clearWanderTimeout = () => {
    if (wanderTimeout.current) {
      clearTimeout(wanderTimeout.current);
      wanderTimeout.current = null;
    }
  };

  const clearLightWakeTimeout = () => {
    if (lightWakeTimeoutRef.current) {
      clearTimeout(lightWakeTimeoutRef.current);
      lightWakeTimeoutRef.current = null;
    }
  };

  const stopAllMotion = () => {
    clearWanderTimeout();
    clearLightWakeTimeout();
    stopLoop(watchLoopRef);
    stopLoop(curiousLoopRef);
    stopLoop(breathingLoopRef);
    stopLoop(idleFloatLoopRef);
    stopAnimatedValues([
      posX,
      posY,
      scale,
      idleFloat,
      zzzOpacity,
      webOpacity,
      silkOpacity,
      blinkScaleY,
      watchNudge,
      curiousNudge,
      offerOpacity,
      offerScale,
      offerThreadOpacity,
    ]);
  };

  const hideSleepVisuals = () => {
    zzzOpacity.setValue(0);
    silkOpacity.setValue(0);
    setShowSilk(false);
    webOpacity.setValue(0);
  };

  const showSleepVisuals = () => {
    zzzOpacity.setValue(1);
    webOpacity.setValue(1);
    silkOpacity.setValue(0);
    setShowSilk(false);
  };

  const startWatchScan = () => {
    stopLoop(watchLoopRef);
    watchNudge.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(watchNudge, {
          toValue: STATE_CONFIG[STATES.WATCH].scanAmount,
          duration: STATE_CONFIG[STATES.WATCH].scanForwardDuration,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(watchNudge, {
          toValue: -STATE_CONFIG[STATES.WATCH].scanAmount * 0.6,
          duration: STATE_CONFIG[STATES.WATCH].scanBackDuration,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(watchNudge, {
          toValue: 0,
          duration: 3400,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.delay(STATE_CONFIG[STATES.WATCH].lingerDuration),
      ])
    );

    watchLoopRef.current = loop;
    loop.start();
  };

  const startCuriousScan = () => {
    stopLoop(curiousLoopRef);
    curiousNudge.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(curiousNudge, {
          toValue: STATE_CONFIG[STATES.CURIOUS].scanAmount,
          duration: STATE_CONFIG[STATES.CURIOUS].scanForwardDuration,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(curiousNudge, {
          toValue: -STATE_CONFIG[STATES.CURIOUS].scanAmount * 0.85,
          duration: STATE_CONFIG[STATES.CURIOUS].scanBackDuration,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
        Animated.delay(STATE_CONFIG[STATES.CURIOUS].lingerDuration),
        Animated.timing(curiousNudge, {
          toValue: 0,
          duration: 3400,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ])
    );

    curiousLoopRef.current = loop;
    loop.start();
  };

  const wanderBottomEdge = (animationId: number) => {
    if (!isAnimationCurrent(animationId)) return;
    if (visibleStateRef.current !== STATES.IDLE) return;

    const targetX =
      positions.leftWallX + Math.random() * Math.max(1, positions.rightWallX - positions.leftWallX);
    const duration =
      STATE_CONFIG[STATES.IDLE].moveDurationMin +
      Math.random() *
        (STATE_CONFIG[STATES.IDLE].moveDurationMax - STATE_CONFIG[STATES.IDLE].moveDurationMin);

    Animated.timing(posX, {
      toValue: targetX,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!isAnimationCurrent(animationId)) return;
      if (visibleStateRef.current !== STATES.IDLE) return;

      const pause =
        STATE_CONFIG[STATES.IDLE].pauseMin +
        Math.random() * (STATE_CONFIG[STATES.IDLE].pauseMax - STATE_CONFIG[STATES.IDLE].pauseMin);

      wanderTimeout.current = setTimeout(() => {
        wanderBottomEdge(animationId);
      }, pause);
    });
  };

  const animateSleep = (onComplete?: () => void) => {
    nextAnimationId();
    stopAllMotion();

    setVisibleState(STATES.SLEEP);
    visibleStateRef.current = STATES.SLEEP;

    const sleepPos = positions.getSleepPosition();
    posX.setValue(sleepPos.x);
    posY.setValue(sleepPos.y);
    posXRef.current = sleepPos.x;
    posYRef.current = sleepPos.y;
    scale.setValue(1);
    blinkScaleY.setValue(1);
    watchNudge.setValue(0);
    curiousNudge.setValue(0);
    idleFloat.setValue(0);

    showSleepVisuals();
    onComplete?.();
  };

  const playBlinkSequence = (onComplete?: () => void) => {
    Animated.sequence([
      Animated.timing(blinkScaleY, { toValue: 0.28, duration: 240, useNativeDriver: true }),
      Animated.timing(blinkScaleY, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.delay(420),
      Animated.timing(blinkScaleY, { toValue: 0.36, duration: 240, useNativeDriver: true }),
      Animated.timing(blinkScaleY, { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const animateLightWake = (onComplete?: () => void) => {
    const animationId = nextAnimationId();
    stopAllMotion();

    setVisibleState(STATES.LIGHT_WAKE);
    visibleStateRef.current = STATES.LIGHT_WAKE;

    const pos = positions.getLightWakePosition();
    posX.setValue(pos.x);
    posY.setValue(pos.y);
    posXRef.current = pos.x;
    posYRef.current = pos.y;
    showSleepVisuals();

    Animated.timing(zzzOpacity, {
      toValue: 0.55,
      duration: 1000,
      easing: CALM_EASING,
      useNativeDriver: true,
    }).start();

    playBlinkSequence();

    lightWakeTimeoutRef.current = setTimeout(() => {
      if (!isAnimationCurrent(animationId)) return;
      playBlinkSequence(() => {
        onComplete?.();
      });
    }, STATE_CONFIG[STATES.LIGHT_WAKE].blinkPauseMs);
  };

  const doWakeStretch = (onComplete?: () => void) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: STATE_CONFIG[STATES.WAKE].stretchScale,
        duration: STATE_CONFIG[STATES.WAKE].stretchDurationIn,
        easing: CALM_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.008,
        duration: STATE_CONFIG[STATES.WAKE].stretchDurationOut,
        easing: CALM_EASING,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const animateWakeToIdle = (onComplete?: () => void) => {
    const animationId = nextAnimationId();
    stopAllMotion();

    setVisibleState(STATES.WAKE);
    visibleStateRef.current = STATES.WAKE;

    const startPos = positions.getLightWakePosition();
    const idlePos = positions.getIdleHomePosition();

    posX.setValue(startPos.x);
    posY.setValue(startPos.y);
    posXRef.current = startPos.x;
    posYRef.current = startPos.y;
    showSleepVisuals();

    Animated.timing(zzzOpacity, {
      toValue: 0,
      duration: STATE_CONFIG[STATES.WAKE].zzzFadeDuration,
      easing: CALM_EASING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      doWakeStretch(() => {
        if (!isAnimationCurrent(animationId)) return;

        setShowSilk(true);
        Animated.timing(silkOpacity, {
          toValue: 1,
          duration: 500,
          easing: CALM_EASING,
          useNativeDriver: true,
        }).start(({ finished: silkInFinished }) => {
          if (!silkInFinished || !isAnimationCurrent(animationId)) return;

          animateXY({
            posX,
            posY,
            toX: idlePos.x,
            toY: idlePos.y,
            duration: STATE_CONFIG[STATES.WAKE].descendDuration,
            easing: CALM_EASING,
            onComplete: () => {
              if (!isAnimationCurrent(animationId)) return;

              Animated.timing(silkOpacity, {
                toValue: 0,
                duration: 500,
                easing: CALM_EASING,
                useNativeDriver: true,
              }).start(({ finished: silkOutFinished }) => {
                if (!silkOutFinished || !isAnimationCurrent(animationId)) return;

                setShowSilk(false);
                webOpacity.setValue(0);
                setVisibleState(STATES.IDLE);
                visibleStateRef.current = STATES.IDLE;

                onComplete?.();
                wanderTimeout.current = setTimeout(() => {
                  wanderBottomEdge(animationId);
                }, 2200);
              });
            },
          });
        });
      });
    });
  };

  const animateIdle = (onComplete?: () => void) => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.IDLE);
    visibleStateRef.current = STATES.IDLE;

    const idlePos = positions.getIdleHomePosition();

    Animated.sequence([
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: idlePos.x,
          duration: 4200,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: idlePos.y,
          duration: 4200,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      Animated.timing(scale, {
        toValue: 1,
        duration: 1800,
        easing: CALM_EASING,
        useNativeDriver: true,
      }).start();

      onComplete?.();
      wanderTimeout.current = setTimeout(() => {
        wanderBottomEdge(animationId);
      }, 2400);
    });
  };

  const animateCurious = (onComplete?: () => void) => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.CURIOUS);
    visibleStateRef.current = STATES.CURIOUS;

    const currentX = posXRef.current;
    const currentY = posYRef.current;
    const desired = positions.getCuriousPosition();
    const entryX = currentX + (desired.x - currentX) * 0.58;
    const entryY = currentY + (desired.y - currentY) * 0.62;

    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: entryX,
          duration: 3800,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: entryY,
          duration: 3800,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: desired.x,
          duration: STATE_CONFIG[STATES.CURIOUS].enterDuration,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: desired.y,
          duration: STATE_CONFIG[STATES.CURIOUS].enterDuration,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.01,
          duration: 2600,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;
      startCuriousScan();
      onComplete?.();
    });
  };

  const animateGuard = (onComplete?: () => void) => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();
    curiousNudge.setValue(0);
    watchNudge.setValue(0);

    setVisibleState(STATES.GUARD);
    visibleStateRef.current = STATES.GUARD;

    const midway = positions.getGuardMidwayPosition();
    const guardPos = positions.getGuardPosition();
    const currentY = posYRef.current;
    const liftY = currentY + (guardPos.y - currentY) * 0.45;

    Animated.sequence([
      Animated.delay(STATE_CONFIG[STATES.GUARD].decisionPause),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.012,
          duration: 1800,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posX, {
          toValue: midway.x,
          duration: STATE_CONFIG[STATES.GUARD].moveDurationPhase1,
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: liftY,
          duration: Math.max(3600, STATE_CONFIG[STATES.GUARD].moveDurationPhase1 - 1200),
          easing: DRIFT_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(STATE_CONFIG[STATES.GUARD].meanderPause),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: guardPos.x,
          duration: STATE_CONFIG[STATES.GUARD].moveDurationPhase2,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: guardPos.y,
          duration: Math.max(4800, STATE_CONFIG[STATES.GUARD].moveDurationPhase2 - 1200),
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(STATE_CONFIG[STATES.GUARD].settlePause),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      Animated.sequence([
        Animated.timing(scale, {
          toValue: STATE_CONFIG[STATES.GUARD].settleScalePeak,
          duration: 1100,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: STATE_CONFIG[STATES.GUARD].settleScaleRest,
          duration: 1400,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    });
  };

  const animateWatch = (onComplete?: () => void) => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.WATCH);
    visibleStateRef.current = STATES.WATCH;

    const watchPos = positions.getWatchPosition();

    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: watchPos.x,
          duration: STATE_CONFIG[STATES.WATCH].enterDuration,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: watchPos.y,
          duration: STATE_CONFIG[STATES.WATCH].enterDuration,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.02,
          duration: 1200,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.008,
          duration: 1400,
          easing: CALM_EASING,
          useNativeDriver: true,
        }),
      ]).start();

      startWatchScan();
      onComplete?.();
    });
  };

  const runVisibleMotionStep = useEffectEvent(
    (step: VisibleTransitionStep, onComplete?: () => void) => {
      switch (step.motion) {
        case 'sleep':
          animateSleep(onComplete);
          return;
        case 'light_wake':
          animateLightWake(onComplete);
          return;
        case 'wake_to_idle':
          animateWakeToIdle(onComplete);
          return;
        case 'idle':
          animateIdle(onComplete);
          return;
        case 'curious':
          animateCurious(onComplete);
          return;
        case 'guard':
          animateGuard(onComplete);
          return;
        case 'watch':
          animateWatch(onComplete);
          return;
      }
    }
  );

  const runVisibleTransitionPlan = useEffectEvent((args: RunVisibleTransitionArgs) => {
    const plan = buildVisibleTransitionPlan({
      fromVisibleState: visibleStateRef.current,
      toTrueState: args.toTrueState,
      signals: args.signals,
      context: args.context,
      confidence: args.confidence,
    });

    if (!plan.steps.length) return;

    const queue = [...plan.steps];

    const runNext = () => {
      const nextStep = queue.shift();
      if (!nextStep) return;
      runVisibleMotionStep(nextStep, runNext);
    };

    runNext();
  });

  const showOfferAnimation = () => {
    Animated.parallel([
      Animated.timing(offerOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(offerScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.bezier(0.22, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(offerThreadOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideOfferAnimation = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(offerOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(offerScale, {
        toValue: 0.92,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(offerThreadOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  const resetOfferVisuals = () => {
    offerOpacity.setValue(0);
    offerScale.setValue(0.92);
    offerThreadOpacity.setValue(0);
  };

  useEffect(() => {
    const xId = posX.addListener(({ value }) => {
      posXRef.current = value;
    });

    const yId = posY.addListener(({ value }) => {
      posYRef.current = value;
    });

    return () => {
      posX.removeListener(xId);
      posY.removeListener(yId);
    };
  }, [posX, posY]);

  useEffect(() => {
    const sleepPos = positions.getSleepPosition();
    posX.setValue(sleepPos.x);
    posY.setValue(sleepPos.y);
    posXRef.current = sleepPos.x;
    posYRef.current = sleepPos.y;
    scale.setValue(1);
    blinkScaleY.setValue(1);
    watchNudge.setValue(0);
    curiousNudge.setValue(0);
    idleFloat.setValue(0);
    zzzOpacity.setValue(1);
    webOpacity.setValue(1);
    silkOpacity.setValue(0);
    setShowSilk(false);
    resetOfferVisuals();

    return () => {
      stopAllMotion();
    };
  }, []);

  useEffect(() => {
    visibleStateRef.current = visibleState;
  }, [visibleState]);

  return {
    visibleState,
    showSilk,
    posX,
    posY,
    scale,
    idleFloat,
    zzzOpacity,
    webOpacity,
    silkOpacity,
    blinkScaleY,
    watchNudge,
    curiousNudge,
    offerOpacity,
    offerScale,
    offerThreadOpacity,
    leftWallX: positions.leftWallX,
    rightWallX: positions.rightWallX,
    topWallY: positions.topWallY,
    bottomWallY: positions.bottomWallY,
    offerAnchor: positions.getOfferAnchor(),
    runVisibleTransitionPlan,
    showOfferAnimation,
    hideOfferAnimation,
    resetOfferVisuals,
  };
}
