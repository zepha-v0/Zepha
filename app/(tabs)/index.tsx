import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const STATES = {
  SLEEP: 'sleep',
  WAKE: 'wake',
  IDLE: 'idle',
  CURIOUS: 'curious',
  GUARD: 'guard',
  WATCH: 'watch',
} as const;

type ZephaState = (typeof STATES)[keyof typeof STATES];

type ActivityLevel = 'still' | 'light' | 'active';
type WakeMode = 'none' | 'light' | 'full';

type ZephaSignals = {
  now: number;
  appIsActive: boolean;
  appState: AppStateStatus;
  lastInteractionAt: number;
  lastForegroundAt: number;
  sessionStartedAt: number;
  interactionEvents: number[];
  focusMode: boolean;
  meetingSoon: boolean;
  manualWorkIntent: boolean;
  manualUrgency: boolean;
  firstRunLearningMode: boolean;
};

type ZephaContext = {
  inactivityMs: number;
  sessionDurationMs: number;
  interactionsLast10s: number;
  interactionsLast60s: number;
  activityLevel: ActivityLevel;
  sustainedEngagement: boolean;
  wakeWindowActive: boolean;
  sleepEligible: boolean;
  workIntentActive: boolean;
  guardIntentActive: boolean;
  shouldDecompress: boolean;
  wakeMode: WakeMode;
};

type ZephaConfidence = {
  sleep: number;
  idle: number;
  curious: number;
  guard: number;
  watch: number;
};

type BrainDecision = {
  nextState: ZephaState;
  reason: string;
};

const STATE_CONFIG = {
  [STATES.SLEEP]: {
    label: 'sleeping',
    priority: 0,
  },
  [STATES.WAKE]: {
    label: 'waking',
    priority: 1,
    zzzFadeDuration: 1000,
    stretchDurationIn: 850,
    stretchDurationOut: 950,
    descendDuration: 5000,
    stretchScale: 1.08,
    graceMs: 16000,
  },
  [STATES.IDLE]: {
    label: 'just existing',
    priority: 2,
    moveDurationMin: 28000,
    moveDurationMax: 52000,
    pauseMin: 2500,
    pauseMax: 5500,
    floatAmount: 0.75,
  },
  [STATES.CURIOUS]: {
    label: 'noticing',
    priority: 3,
    minDwellMs: 12000,
    scanAmount: 14,
    scanForwardDuration: 2200,
    scanBackDuration: 2600,
    lingerDuration: 800,
    enterDuration: 3600,
  },
  [STATES.GUARD]: {
    label: 'holding for you',
    priority: 5,
    decisionPause: 500,
    moveDuration: 5200,
    settlePause: 700,
    settleScalePeak: 1.08,
    settleScaleRest: 1.04,
    minDwellMs: 22000,
  },
  [STATES.WATCH]: {
    label: 'watching',
    priority: 4,
    minDwellMs: 15000,
    scanAmount: 16,
    scanForwardDuration: 2400,
    scanBackDuration: 3000,
    lingerDuration: 900,
    enterDuration: 2400,
  },
} as const;

const ZEPHA_SIZE = 90;
const EDGE_MARGIN = 10;
const BOTTOM_UI_OFFSET = 8;

const LONG_INACTIVITY_MS = 45 * 60 * 1000;
const SOFT_INACTIVITY_MS = 75 * 1000;
const CURIOUS_TRIGGER_MS = 12 * 1000;
const WATCH_TO_IDLE_MS = 25 * 1000;
const WAKE_WINDOW_MS = 18 * 1000;
const SUSTAINED_ENGAGEMENT_MS = 90 * 1000;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function countEventsSince(events: number[], now: number, windowMs: number) {
  const cutoff = now - windowMs;
  return events.filter((timestamp) => timestamp >= cutoff).length;
}

function buildZephaContext(signals: ZephaSignals): ZephaContext {
  const inactivityMs = signals.now - signals.lastInteractionAt;
  const sessionDurationMs = signals.now - signals.sessionStartedAt;
  const sinceForegroundMs = signals.now - signals.lastForegroundAt;

  const interactionsLast10s = countEventsSince(signals.interactionEvents, signals.now, 10_000);
  const interactionsLast60s = countEventsSince(signals.interactionEvents, signals.now, 60_000);

  let activityLevel: ActivityLevel = 'still';
  if (interactionsLast10s >= 5 || interactionsLast60s >= 18) {
    activityLevel = 'active';
  } else if (interactionsLast10s >= 1 || interactionsLast60s >= 5) {
    activityLevel = 'light';
  }

  const sustainedEngagement =
    sessionDurationMs >= SUSTAINED_ENGAGEMENT_MS &&
    (interactionsLast60s >= 8 || activityLevel === 'active');

  const wakeWindowActive =
    signals.appIsActive && sinceForegroundMs <= WAKE_WINDOW_MS;

  const sleepEligible =
    !signals.appIsActive && inactivityMs >= LONG_INACTIVITY_MS;

  const workIntentActive =
    signals.focusMode || signals.meetingSoon || signals.manualWorkIntent;

  const guardIntentActive = workIntentActive || signals.manualUrgency;

  const shouldDecompress =
    !guardIntentActive &&
    (sustainedEngagement || signals.focusMode || signals.meetingSoon);

  let wakeMode: WakeMode = 'none';
  if (wakeWindowActive) {
    wakeMode = guardIntentActive ? 'full' : 'light';
  }

  return {
    inactivityMs,
    sessionDurationMs,
    interactionsLast10s,
    interactionsLast60s,
    activityLevel,
    sustainedEngagement,
    wakeWindowActive,
    sleepEligible,
    workIntentActive,
    guardIntentActive,
    shouldDecompress,
    wakeMode,
  };
}

function scoreZephaConfidence(
  context: ZephaContext,
  signals: ZephaSignals
): ZephaConfidence {
  let sleep = 0;
  let idle = 0.35;
  let curious = 0.15;
  let guard = 0;
  let watch = 0;

  if (!signals.appIsActive) {
    sleep += 0.25;
  }

  if (context.inactivityMs > 3 * 60 * 1000) {
    sleep += 0.25;
    idle += 0.15;
  }

  if (context.sleepEligible) {
    sleep += 0.5;
  }

  if (context.activityLevel === 'still') {
    idle += 0.3;
  }

  if (context.activityLevel === 'light') {
    idle += 0.15;
    curious += 0.25;
  }

  if (context.activityLevel === 'active') {
    curious += 0.35;
  }

  if (context.inactivityMs > CURIOUS_TRIGGER_MS && context.inactivityMs < LONG_INACTIVITY_MS) {
    curious += 0.22;
  }

  if (signals.firstRunLearningMode) {
    curious -= 0.18;
    idle += 0.12;
  }

  if (context.sustainedEngagement) {
    curious += 0.14;
    watch += 0.12;
  }

  if (context.workIntentActive) {
    guard += 0.45;
    idle -= 0.12;
  }

  if (context.guardIntentActive) {
    guard += 0.35;
    curious += 0.08;
  }

  if (signals.manualUrgency) {
    guard += 0.3;
  }

  if (context.shouldDecompress) {
    watch += 0.32;
  }

  if (context.wakeWindowActive) {
    idle += 0.08;
    curious += 0.08;
  }

  return {
    sleep: clamp01(sleep),
    idle: clamp01(idle),
    curious: clamp01(curious),
    guard: clamp01(guard),
    watch: clamp01(watch),
  };
}

function decideZephaState(
  currentState: ZephaState,
  signals: ZephaSignals,
  context: ZephaContext,
  confidence: ZephaConfidence
): BrainDecision {
  if (context.sleepEligible) {
    return { nextState: STATES.SLEEP, reason: 'sleep eligible after long inactivity' };
  }

  if (currentState === STATES.SLEEP) {
    if (context.guardIntentActive) {
      return { nextState: STATES.GUARD, reason: 'guard intent while sleeping' };
    }

    if (context.wakeWindowActive) {
      return { nextState: STATES.WAKE, reason: `foreground wake (${context.wakeMode})` };
    }

    return { nextState: STATES.SLEEP, reason: 'remain asleep' };
  }

  if (currentState === STATES.WAKE) {
    if (confidence.guard >= 0.55) {
      return { nextState: STATES.GUARD, reason: 'wake escalated to guard' };
    }

    if (context.wakeWindowActive) {
      return { nextState: STATES.WAKE, reason: 'wake grace window' };
    }

    if (confidence.curious >= 0.48 && !signals.firstRunLearningMode) {
      return { nextState: STATES.CURIOUS, reason: 'wake resolving into curiosity' };
    }

    return { nextState: STATES.IDLE, reason: 'wake settled to idle' };
  }

  if (currentState === STATES.GUARD) {
    if (confidence.guard >= 0.45 || context.guardIntentActive) {
      return { nextState: STATES.GUARD, reason: 'maintain guard' };
    }

    return { nextState: STATES.WATCH, reason: 'guard released to watch' };
  }

  if (currentState === STATES.WATCH) {
    if (confidence.guard >= 0.55 || context.guardIntentActive) {
      return { nextState: STATES.GUARD, reason: 'watch resumed guard' };
    }

    if (context.inactivityMs > WATCH_TO_IDLE_MS || confidence.idle >= 0.55) {
      return { nextState: STATES.IDLE, reason: 'watch cooled to idle' };
    }

    return { nextState: STATES.WATCH, reason: 'continue watch' };
  }

  if (confidence.guard >= 0.62) {
    return { nextState: STATES.GUARD, reason: 'high guard confidence' };
  }

  if (confidence.sleep >= 0.7) {
    return { nextState: STATES.SLEEP, reason: 'sleep confidence high' };
  }

  if (confidence.curious >= 0.5 && !signals.firstRunLearningMode) {
    return { nextState: STATES.CURIOUS, reason: 'medium uncertainty curiosity' };
  }

  return { nextState: STATES.IDLE, reason: 'calm baseline certainty' };
}

function formatMs(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}m ${rem}s`;
}

function useZephaSignals(params: {
  focusMode: boolean;
  meetingSoon: boolean;
  manualWorkIntent: boolean;
  manualUrgency: boolean;
  firstRunLearningMode: boolean;
}) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastInteractionAt = useRef(Date.now());
  const lastForegroundAt = useRef(Date.now());
  const sessionStartedAt = useRef(Date.now());
  const interactionEvents = useRef<number[]>([]);
  const [, forceRender] = useState(0);

  const pruneInteractions = (now: number) => {
    interactionEvents.current = interactionEvents.current.filter(
      (timestamp) => now - timestamp <= 5 * 60 * 1000
    );
  };

  const markInteraction = () => {
    const now = Date.now();
    lastInteractionAt.current = now;
    interactionEvents.current = [...interactionEvents.current, now];
    pruneInteractions(now);
    forceRender((v) => v + 1);
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;

      if (nextState === 'active') {
        const now = Date.now();
        lastForegroundAt.current = now;
        sessionStartedAt.current = now;
        lastInteractionAt.current = now;
        interactionEvents.current = [...interactionEvents.current, now];
        pruneInteractions(now);
        forceRender((v) => v + 1);
      } else {
        forceRender((v) => v + 1);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      pruneInteractions(Date.now());
      forceRender((v) => v + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const signals = useMemo<ZephaSignals>(
    () => ({
      now: Date.now(),
      appIsActive: appState.current === 'active',
      appState: appState.current,
      lastInteractionAt: lastInteractionAt.current,
      lastForegroundAt: lastForegroundAt.current,
      sessionStartedAt: sessionStartedAt.current,
      interactionEvents: interactionEvents.current,
      focusMode: params.focusMode,
      meetingSoon: params.meetingSoon,
      manualWorkIntent: params.manualWorkIntent,
      manualUrgency: params.manualUrgency,
      firstRunLearningMode: params.firstRunLearningMode,
    }),
    [
      params.focusMode,
      params.meetingSoon,
      params.manualWorkIntent,
      params.manualUrgency,
      params.firstRunLearningMode,
    ]
  );

  return {
    signals,
    markInteraction,
    lastInteractionAt,
    lastForegroundAt,
    sessionStartedAt,
    interactionEvents,
  };
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();

  const [trueState, setTrueState] = useState<ZephaState>(STATES.SLEEP);
  const [visibleState, setVisibleState] = useState<ZephaState>(STATES.SLEEP);
  const [brainReason, setBrainReason] = useState('initial sleep');
  const [showSilk, setShowSilk] = useState(false);

  const [focusMode, setFocusMode] = useState(false);
  const [meetingSoon, setMeetingSoon] = useState(false);
  const [manualWorkIntent, setManualWorkIntent] = useState(false);
  const [manualUrgency, setManualUrgency] = useState(false);
  const [firstRunLearningMode] = useState(true);
  const [showDebug, setShowDebug] = useState(true);

  const stateEnteredAt = useRef(Date.now());
  const visibleStateRef = useRef<ZephaState>(STATES.SLEEP);
  const activeAnimationId = useRef(0);

  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const idleFloat = useRef(new Animated.Value(0)).current;
  const zzzOpacity = useRef(new Animated.Value(1)).current;
  const webOpacity = useRef(new Animated.Value(1)).current;
  const silkOpacity = useRef(new Animated.Value(0)).current;
  const blinkScaleY = useRef(new Animated.Value(1)).current;
  const watchNudge = useRef(new Animated.Value(0)).current;
  const curiousNudge = useRef(new Animated.Value(0)).current;

  const wanderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brainTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathingLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const idleFloatLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const watchLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const curiousLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const {
    signals,
    markInteraction,
    lastInteractionAt,
  } = useZephaSignals({
    focusMode,
    meetingSoon,
    manualWorkIntent,
    manualUrgency,
    firstRunLearningMode,
  });

  const context = useMemo(
    () => buildZephaContext(signals),
    [signals]
  );

  const confidence = useMemo(
    () => scoreZephaConfidence(context, signals),
    [context, signals]
  );

  const leftWallX = EDGE_MARGIN;
  const rightWallX = Math.max(EDGE_MARGIN, width - ZEPHA_SIZE - EDGE_MARGIN);
  const topWallY = EDGE_MARGIN;
  const bottomWallY = Math.max(topWallY, height - ZEPHA_SIZE - BOTTOM_UI_OFFSET);

  const getSleepPosition = () => ({ x: leftWallX, y: topWallY });
  const getIdleHomePosition = () => ({ x: leftWallX, y: bottomWallY });
  const getGuardPosition = () => ({ x: rightWallX, y: bottomWallY });
  const getWatchPosition = () => ({ x: Math.max(leftWallX, rightWallX - 32), y: bottomWallY });
  const getCuriousPosition = () => ({
    x: Math.max(leftWallX + 50, Math.min(rightWallX - 50, width * 0.42)),
    y: Math.max(topWallY + 80, bottomWallY - 115),
  });

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

  const stopLoop = (loopRef: React.MutableRefObject<Animated.CompositeAnimation | null>) => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current = null;
    }
  };

  const stopAllMotion = () => {
    clearWanderTimeout();
    stopLoop(watchLoopRef);
    stopLoop(curiousLoopRef);

    posX.stopAnimation();
    posY.stopAnimation();
    scale.stopAnimation();
    zzzOpacity.stopAnimation();
    silkOpacity.stopAnimation();
    blinkScaleY.stopAnimation();
    watchNudge.stopAnimation();
    curiousNudge.stopAnimation();
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

  const canLeaveState = (current: ZephaState, next: ZephaState) => {
    if (current === next) return false;

    const dwell = Date.now() - stateEnteredAt.current;

    if (current === STATES.GUARD && dwell < STATE_CONFIG[STATES.GUARD].minDwellMs) {
      if (next !== STATES.GUARD) return false;
    }

    if (current === STATES.WATCH && dwell < STATE_CONFIG[STATES.WATCH].minDwellMs) {
      if (next !== STATES.GUARD && next !== STATES.WATCH) return false;
    }

    if (current === STATES.CURIOUS && dwell < STATE_CONFIG[STATES.CURIOUS].minDwellMs) {
      if (next !== STATES.GUARD && next !== STATES.CURIOUS) return false;
    }

    return true;
  };

  const updateTrueState = (nextState: ZephaState, reason: string) => {
    if (nextState === trueState) {
      setBrainReason(reason);
      return;
    }

    if (!canLeaveState(trueState, nextState)) {
      return;
    }

    setTrueState(nextState);
    stateEnteredAt.current = Date.now();
    setBrainReason(reason);
  };

  const animateXY = (
    toX: number,
    toY: number,
    duration: number,
    easing: (value: number) => number,
    onComplete?: () => void
  ) => {
    Animated.parallel([
      Animated.timing(posX, {
        toValue: toX,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(posY, {
        toValue: toY,
        duration,
        easing,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const startBreathing = () => {
    stopLoop(breathingLoopRef);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.02,
          duration: 4200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 4200,
          useNativeDriver: true,
        }),
      ])
    );

    breathingLoopRef.current = loop;
    loop.start();
  };

  const startIdleFloat = () => {
    stopLoop(idleFloatLoopRef);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleFloat, {
          toValue: STATE_CONFIG[STATES.IDLE].floatAmount,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(idleFloat, {
          toValue: -STATE_CONFIG[STATES.IDLE].floatAmount,
          duration: 5000,
          useNativeDriver: true,
        }),
      ])
    );

    idleFloatLoopRef.current = loop;
    loop.start();
  };

  const doSlowBlink = (onComplete?: () => void) => {
    Animated.sequence([
      Animated.timing(blinkScaleY, {
        toValue: 0.18,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(blinkScaleY, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(220),
      Animated.timing(blinkScaleY, {
        toValue: 0.24,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(blinkScaleY, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const doWakeStretch = (onComplete?: () => void) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: STATE_CONFIG[STATES.WAKE].stretchScale,
        duration: STATE_CONFIG[STATES.WAKE].stretchDurationIn,
        easing: Easing.bezier(0.2, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.02,
        duration: STATE_CONFIG[STATES.WAKE].stretchDurationOut,
        easing: Easing.bezier(0.2, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const startWatchScan = () => {
    stopLoop(watchLoopRef);
    watchNudge.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(watchNudge, {
          toValue: STATE_CONFIG[STATES.WATCH].scanAmount,
          duration: STATE_CONFIG[STATES.WATCH].scanForwardDuration,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(watchNudge, {
          toValue: -STATE_CONFIG[STATES.WATCH].scanAmount * 0.65,
          duration: STATE_CONFIG[STATES.WATCH].scanBackDuration,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(watchNudge, {
          toValue: 0,
          duration: 1800,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
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
          easing: Easing.bezier(0.33, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.delay(260),
        Animated.timing(curiousNudge, {
          toValue: -STATE_CONFIG[STATES.CURIOUS].scanAmount,
          duration: STATE_CONFIG[STATES.CURIOUS].scanBackDuration,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.delay(STATE_CONFIG[STATES.CURIOUS].lingerDuration),
        Animated.timing(curiousNudge, {
          toValue: 0,
          duration: 1800,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
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

    const targetX = leftWallX + Math.random() * Math.max(1, rightWallX - leftWallX);
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

  const animateSleep = () => {
    nextAnimationId();
    stopAllMotion();

    setVisibleState(STATES.SLEEP);
    visibleStateRef.current = STATES.SLEEP;

    const sleepPos = getSleepPosition();

    posX.setValue(sleepPos.x);
    posY.setValue(sleepPos.y);
    scale.setValue(1);
    blinkScaleY.setValue(1);
    watchNudge.setValue(0);
    curiousNudge.setValue(0);
    idleFloat.setValue(0);

    showSleepVisuals();
  };

  const animateWakeToIdle = () => {
    const animationId = nextAnimationId();
    stopAllMotion();

    setVisibleState(STATES.WAKE);
    visibleStateRef.current = STATES.WAKE;

    const sleepPos = getSleepPosition();
    const idlePos = getIdleHomePosition();

    posX.setValue(sleepPos.x);
    posY.setValue(sleepPos.y);
    blinkScaleY.setValue(1);
    watchNudge.setValue(0);
    curiousNudge.setValue(0);
    showSleepVisuals();

    Animated.timing(zzzOpacity, {
      toValue: 0,
      duration: STATE_CONFIG[STATES.WAKE].zzzFadeDuration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      doSlowBlink(() => {
        if (!isAnimationCurrent(animationId)) return;

        doWakeStretch(() => {
          if (!isAnimationCurrent(animationId)) return;

          setShowSilk(true);

          Animated.timing(silkOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start(({ finished: silkInFinished }) => {
            if (!silkInFinished || !isAnimationCurrent(animationId)) return;

            animateXY(
              idlePos.x,
              idlePos.y,
              STATE_CONFIG[STATES.WAKE].descendDuration,
              Easing.bezier(0.22, 0, 0.2, 1),
              () => {
                if (!isAnimationCurrent(animationId)) return;

                Animated.timing(silkOpacity, {
                  toValue: 0,
                  duration: 350,
                  useNativeDriver: true,
                }).start(({ finished: silkOutFinished }) => {
                  if (!silkOutFinished || !isAnimationCurrent(animationId)) return;

                  setShowSilk(false);
                  webOpacity.setValue(0);

                  setVisibleState(STATES.IDLE);
                  visibleStateRef.current = STATES.IDLE;

                  wanderTimeout.current = setTimeout(() => {
                    wanderBottomEdge(animationId);
                  }, 1200);
                });
              }
            );
          });
        });
      });
    });
  };

  const animateSleepToGuard = () => {
    const animationId = nextAnimationId();
    stopAllMotion();

    setVisibleState(STATES.WAKE);
    visibleStateRef.current = STATES.WAKE;

    const sleepPos = getSleepPosition();
    const idlePos = getIdleHomePosition();
    const guardPos = getGuardPosition();

    posX.setValue(sleepPos.x);
    posY.setValue(sleepPos.y);
    blinkScaleY.setValue(1);
    watchNudge.setValue(0);
    curiousNudge.setValue(0);
    showSleepVisuals();

    Animated.timing(zzzOpacity, {
      toValue: 0,
      duration: STATE_CONFIG[STATES.WAKE].zzzFadeDuration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      doSlowBlink(() => {
        if (!isAnimationCurrent(animationId)) return;

        doWakeStretch(() => {
          if (!isAnimationCurrent(animationId)) return;

          setShowSilk(true);

          Animated.timing(silkOpacity, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }).start(({ finished: silkInFinished }) => {
            if (!silkInFinished || !isAnimationCurrent(animationId)) return;

            animateXY(
              idlePos.x,
              idlePos.y,
              STATE_CONFIG[STATES.WAKE].descendDuration,
              Easing.bezier(0.22, 0, 0.2, 1),
              () => {
                if (!isAnimationCurrent(animationId)) return;

                Animated.timing(silkOpacity, {
                  toValue: 0,
                  duration: 320,
                  useNativeDriver: true,
                }).start(({ finished: silkOutFinished }) => {
                  if (!silkOutFinished || !isAnimationCurrent(animationId)) return;

                  setShowSilk(false);
                  webOpacity.setValue(0);

                  setVisibleState(STATES.GUARD);
                  visibleStateRef.current = STATES.GUARD;

                  Animated.sequence([
                    Animated.delay(STATE_CONFIG[STATES.GUARD].decisionPause),
                    Animated.parallel([
                      Animated.timing(posX, {
                        toValue: guardPos.x,
                        duration: STATE_CONFIG[STATES.GUARD].moveDuration,
                        easing: Easing.bezier(0.22, 0.0, 0.18, 1),
                        useNativeDriver: true,
                      }),
                      Animated.timing(posY, {
                        toValue: guardPos.y,
                        duration: STATE_CONFIG[STATES.GUARD].moveDuration,
                        easing: Easing.bezier(0.22, 0.0, 0.18, 1),
                        useNativeDriver: true,
                      }),
                    ]),
                    Animated.delay(STATE_CONFIG[STATES.GUARD].settlePause),
                  ]).start(({ finished: guardFinished }) => {
                    if (!guardFinished || !isAnimationCurrent(animationId)) return;

                    Animated.sequence([
                      Animated.timing(scale, {
                        toValue: STATE_CONFIG[STATES.GUARD].settleScalePeak,
                        duration: 1000,
                        easing: Easing.bezier(0.2, 0, 0.2, 1),
                        useNativeDriver: true,
                      }),
                      Animated.timing(scale, {
                        toValue: STATE_CONFIG[STATES.GUARD].settleScaleRest,
                        duration: 950,
                        easing: Easing.bezier(0.2, 0, 0.2, 1),
                        useNativeDriver: true,
                      }),
                    ]).start();
                  });
                });
              }
            );
          });
        });
      });
    });
  };

  const animateIdle = () => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.IDLE);
    visibleStateRef.current = STATES.IDLE;

    const idlePos = getIdleHomePosition();

    Animated.sequence([
      Animated.delay(650),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: idlePos.x,
          duration: 2800,
          easing: Easing.bezier(0.22, 0.0, 0.18, 1),
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: idlePos.y,
          duration: 2800,
          easing: Easing.bezier(0.22, 0.0, 0.18, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(600),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      Animated.timing(scale, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();

      wanderTimeout.current = setTimeout(() => {
        wanderBottomEdge(animationId);
      }, 1200);
    });
  };

  const animateCurious = () => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.CURIOUS);
    visibleStateRef.current = STATES.CURIOUS;

    const curiousPos = getCuriousPosition();

    animateXY(
      curiousPos.x,
      curiousPos.y,
      STATE_CONFIG[STATES.CURIOUS].enterDuration,
      Easing.bezier(0.24, 0.1, 0.2, 1),
      () => {
        if (!isAnimationCurrent(animationId)) return;
        startCuriousScan();
      }
    );
  };

  const animateGuard = () => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.GUARD);
    visibleStateRef.current = STATES.GUARD;

    const guardPos = getGuardPosition();

    Animated.sequence([
      Animated.delay(STATE_CONFIG[STATES.GUARD].decisionPause),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: guardPos.x,
          duration: STATE_CONFIG[STATES.GUARD].moveDuration,
          easing: Easing.bezier(0.22, 0.0, 0.18, 1),
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: guardPos.y,
          duration: STATE_CONFIG[STATES.GUARD].moveDuration,
          easing: Easing.bezier(0.22, 0.0, 0.18, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(STATE_CONFIG[STATES.GUARD].settlePause),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      Animated.sequence([
        Animated.timing(scale, {
          toValue: STATE_CONFIG[STATES.GUARD].settleScalePeak,
          duration: 1000,
          easing: Easing.bezier(0.2, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: STATE_CONFIG[STATES.GUARD].settleScaleRest,
          duration: 950,
          easing: Easing.bezier(0.2, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const animateWatch = () => {
    const animationId = nextAnimationId();
    stopAllMotion();
    hideSleepVisuals();

    setVisibleState(STATES.WATCH);
    visibleStateRef.current = STATES.WATCH;

    const watchPos = getWatchPosition();

    Animated.sequence([
      Animated.delay(450),
      Animated.parallel([
        Animated.timing(posX, {
          toValue: watchPos.x,
          duration: STATE_CONFIG[STATES.WATCH].enterDuration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: watchPos.y,
          duration: STATE_CONFIG[STATES.WATCH].enterDuration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
    ]).start(({ finished }) => {
      if (!finished || !isAnimationCurrent(animationId)) return;

      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.01,
          duration: 850,
          useNativeDriver: true,
        }),
      ]).start();

      startWatchScan();
    });
  };

  useEffect(() => {
    startBreathing();
    startIdleFloat();

    const sleepPos = getSleepPosition();
    posX.setValue(sleepPos.x);
    posY.setValue(sleepPos.y);
    scale.setValue(1);
    blinkScaleY.setValue(1);
    watchNudge.setValue(0);
    curiousNudge.setValue(0);
    idleFloat.setValue(0);
    showSleepVisuals();

    return () => {
      stopAllMotion();
      stopLoop(breathingLoopRef);
      stopLoop(idleFloatLoopRef);

      if (brainTickRef.current) {
        clearInterval(brainTickRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (brainTickRef.current) {
      clearInterval(brainTickRef.current);
    }

    brainTickRef.current = setInterval(() => {
      const freshSignals: ZephaSignals = {
        ...signals,
        now: Date.now(),
      };

      const freshContext = buildZephaContext(freshSignals);
      const freshConfidence = scoreZephaConfidence(freshContext, freshSignals);
      const decision = decideZephaState(trueState, freshSignals, freshContext, freshConfidence);

      updateTrueState(decision.nextState, decision.reason);
    }, 2000);

    return () => {
      if (brainTickRef.current) {
        clearInterval(brainTickRef.current);
      }
    };
  }, [signals, trueState]);

  useEffect(() => {
    visibleStateRef.current = visibleState;
  }, [visibleState]);

  useEffect(() => {
    if (trueState === STATES.SLEEP) {
      animateSleep();
      return;
    }

    if (trueState === STATES.WAKE) {
      animateWakeToIdle();
      return;
    }

    if (trueState === STATES.IDLE) {
      animateIdle();
      return;
    }

    if (trueState === STATES.CURIOUS) {
      animateCurious();
      return;
    }

    if (trueState === STATES.GUARD) {
      if (visibleStateRef.current === STATES.SLEEP) {
        animateSleepToGuard();
      } else {
        animateGuard();
      }
      return;
    }

    if (trueState === STATES.WATCH) {
      animateWatch();
    }
  }, [trueState, width, height]);

  const silkHeight = Animated.subtract(posY, topWallY + 40);

  const zephaTranslateX =
    visibleState === STATES.WATCH
      ? Animated.add(posX, watchNudge)
      : visibleState === STATES.CURIOUS
      ? Animated.add(posX, curiousNudge)
      : posX;

  return (
    <View
      style={styles.container}
      onTouchStart={() => {
        markInteraction();
      }}
    >
      <Text style={styles.text}>{STATE_CONFIG[visibleState].label}</Text>
      <Text style={styles.subtext}>brain: {brainReason}</Text>
      <Text style={styles.subtext}>trueState: {trueState}</Text>

      {(visibleState === STATES.SLEEP || visibleState === STATES.WAKE) && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sleepWeb,
            {
              opacity: webOpacity,
              left: leftWallX + 18,
              top: topWallY - 2,
            },
          ]}
        >
          <Text style={styles.sleepWebText}>✧╱╲✧</Text>
        </Animated.View>
      )}

      {showSilk && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.silk,
            {
              opacity: silkOpacity,
              left: leftWallX + ZEPHA_SIZE / 2,
              top: topWallY + 38,
              height: silkHeight,
            },
          ]}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.zzzWrap,
          {
            opacity: zzzOpacity,
            transform: [
              { translateX: Animated.add(posX, 44) },
              { translateY: Animated.add(posY, -14) },
            ],
          },
        ]}
      >
        <Text style={styles.zzz}>Zzz</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.zepha,
          {
            transform: [
              { translateX: zephaTranslateX },
              { translateY: Animated.add(posY, idleFloat) },
              { scale },
              { scaleY: blinkScaleY },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            markInteraction();

            if (visibleState === STATES.SLEEP) {
              updateTrueState(STATES.WAKE, 'manual wake tap');
            } else if (visibleState === STATES.IDLE) {
              updateTrueState(STATES.CURIOUS, 'manual interaction from idle');
            } else if (visibleState === STATES.CURIOUS) {
              updateTrueState(STATES.GUARD, 'manual escalate to guard');
            } else if (visibleState === STATES.GUARD) {
              updateTrueState(STATES.WATCH, 'manual release guard');
            } else if (visibleState === STATES.WATCH) {
              updateTrueState(STATES.IDLE, 'manual settle to idle');
            } else if (visibleState === STATES.WAKE) {
              updateTrueState(STATES.GUARD, 'manual wake escalation');
            }
          }}
        >
          <Text style={styles.spider}>🕷️</Text>
        </Pressable>
      </Animated.View>

      <View style={styles.debugBar}>
        <Pressable
          style={[styles.debugButton, focusMode && styles.debugButtonActive]}
          onPress={() => {
            markInteraction();
            setFocusMode((v) => !v);
          }}
        >
          <Text style={styles.debugButtonText}>
            {focusMode ? 'focus: on' : 'focus: off'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, meetingSoon && styles.debugButtonActive]}
          onPress={() => {
            markInteraction();
            setMeetingSoon((v) => !v);
          }}
        >
          <Text style={styles.debugButtonText}>
            {meetingSoon ? 'meeting: soon' : 'meeting: no'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, manualWorkIntent && styles.debugButtonActive]}
          onPress={() => {
            markInteraction();
            setManualWorkIntent((v) => !v);
          }}
        >
          <Text style={styles.debugButtonText}>
            {manualWorkIntent ? 'work: on' : 'work: off'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, manualUrgency && styles.debugButtonActive]}
          onPress={() => {
            markInteraction();
            setManualUrgency((v) => !v);
          }}
        >
          <Text style={styles.debugButtonText}>
            {manualUrgency ? 'urgent: on' : 'urgent: off'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.debugButton}
          onPress={() => {
            lastInteractionAt.current = Date.now() - 2 * 60 * 1000;
            setBrainReason('debug: forced inactivity');
          }}
        >
          <Text style={styles.debugButtonText}>fake idle</Text>
        </Pressable>

        <Pressable
          style={styles.debugButton}
          onPress={() => {
            updateTrueState(STATES.SLEEP, 'manual sleep');
          }}
        >
          <Text style={styles.debugButtonText}>sleep</Text>
        </Pressable>

        <Pressable
          style={styles.debugButton}
          onPress={() => {
            setShowDebug((v) => !v);
          }}
        >
          <Text style={styles.debugButtonText}>
            {showDebug ? 'hide brain' : 'show brain'}
          </Text>
        </Pressable>
      </View>

      {showDebug && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>signals</Text>
          <Text style={styles.debugLine}>app active: {signals.appIsActive ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>activity: {context.activityLevel}</Text>
          <Text style={styles.debugLine}>wake mode: {context.wakeMode}</Text>
          <Text style={styles.debugLine}>inactive: {formatMs(context.inactivityMs)}</Text>
          <Text style={styles.debugLine}>session: {formatMs(context.sessionDurationMs)}</Text>
          <Text style={styles.debugLine}>10s interactions: {context.interactionsLast10s}</Text>
          <Text style={styles.debugLine}>60s interactions: {context.interactionsLast60s}</Text>

          <Text style={styles.debugTitle}>context</Text>
          <Text style={styles.debugLine}>
            sustained: {context.sustainedEngagement ? 'yes' : 'no'}
          </Text>
          <Text style={styles.debugLine}>
            work intent: {context.workIntentActive ? 'yes' : 'no'}
          </Text>
          <Text style={styles.debugLine}>
            guard intent: {context.guardIntentActive ? 'yes' : 'no'}
          </Text>
          <Text style={styles.debugLine}>
            wake window: {context.wakeWindowActive ? 'yes' : 'no'}
          </Text>
          <Text style={styles.debugLine}>
            sleep eligible: {context.sleepEligible ? 'yes' : 'no'}
          </Text>
          <Text style={styles.debugLine}>
            decompress: {context.shouldDecompress ? 'yes' : 'no'}
          </Text>

          <Text style={styles.debugTitle}>confidence</Text>
          <Text style={styles.debugLine}>sleep: {confidence.sleep.toFixed(2)}</Text>
          <Text style={styles.debugLine}>idle: {confidence.idle.toFixed(2)}</Text>
          <Text style={styles.debugLine}>curious: {confidence.curious.toFixed(2)}</Text>
          <Text style={styles.debugLine}>guard: {confidence.guard.toFixed(2)}</Text>
          <Text style={styles.debugLine}>watch: {confidence.watch.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081238',
  },
  text: {
    color: '#dbeafe',
    marginTop: 22,
    fontSize: 16,
    textAlign: 'center',
  },
  subtext: {
    color: '#94a3b8',
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  zepha: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  spider: {
    fontSize: ZEPHA_SIZE,
  },
  zzzWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  zzz: {
    color: '#c4b5fd',
    fontSize: 18,
    opacity: 0.9,
  },
  sleepWeb: {
    position: 'absolute',
  },
  sleepWebText: {
    color: '#93c5fd',
    fontSize: 14,
    opacity: 0.65,
  },
  silk: {
    position: 'absolute',
    width: 1.5,
    backgroundColor: 'rgba(200, 220, 255, 0.55)',
    borderRadius: 999,
  },
  debugBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  debugButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
  debugButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  debugButtonText: {
    color: '#dbeafe',
    fontSize: 12,
  },
  debugPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 90,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  debugTitle: {
    color: '#bfdbfe',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '700',
  },
  debugLine: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
});