import { STATES } from './states';

export const STATE_CONFIG = {
  [STATES.SLEEP]: {
    label: 'sleeping',
    priority: 0,
  },
  [STATES.LIGHT_WAKE]: {
    label: 'half-awake',
    priority: 1,
    minDwellMs: 4600,
    blinkPauseMs: 3200,
  },
  [STATES.WAKE]: {
    label: 'waking',
    priority: 2,
    zzzFadeDuration: 1200,
    stretchDurationIn: 1100,
    stretchDurationOut: 1200,
    descendDuration: 6200,
    stretchScale: 1.045,
    graceMs: 18000,
  },
  [STATES.IDLE]: {
    label: 'just existing',
    priority: 3,
    moveDurationMin: 110000,
    moveDurationMax: 210000,
    pauseMin: 8000,
    pauseMax: 15000,
    floatAmount: 0.2,
  },
  [STATES.CURIOUS]: {
    label: 'noticing',
    priority: 4,
    minDwellMs: 26000,
    scanAmount: 4,
    scanForwardDuration: 8200,
    scanBackDuration: 9800,
    lingerDuration: 3400,
    enterDuration: 6200,
  },
  [STATES.GUARD]: {
    label: 'holding for you',
    priority: 7,
    decisionPause: 1600,
    meanderPause: 1400,
    moveDurationPhase1: 6200,
    moveDurationPhase2: 8400,
    settlePause: 1800,
    settleScalePeak: 1.03,
    settleScaleRest: 1.015,
    minDwellMs: 28000,
  },
  [STATES.WATCH]: {
    label: 'watching',
    priority: 6,
    minDwellMs: 24000,
    scanAmount: 6,
    scanForwardDuration: 6200,
    scanBackDuration: 7800,
    lingerDuration: 2600,
    enterDuration: 4400,
  },
} as const;

export const PRODUCT_CONFIG = {
  confidence: {
    curiousBaseline: 0.34,
    curiousBridge: 0.3,
    guardCommit: 0.66,
    guardImmediate: 0.86,
    guardExtreme: 0.94,
    watchCarry: 0.48,
    idleCalm: 0.68,
  },
  visiblePolicy: {
    preferCuriousBridgeBelow: 0.985,
    urgentWakeGuardBelow: 0.99,
  },
} as const;

export const ZEPHA_SIZE = 90;
export const EDGE_MARGIN = 10;
export const BOTTOM_UI_OFFSET = 8;

export const LONG_INACTIVITY_MS = 45 * 60 * 1000;
export const SOFT_INACTIVITY_MS = 75 * 1000;
export const CURIOUS_TRIGGER_MS = 10 * 1000;
export const WATCH_TO_IDLE_MS = 34 * 1000;
export const WAKE_WINDOW_MS = 18 * 1000;
export const LIGHT_WAKE_WINDOW_MS = 8 * 1000;
export const SUSTAINED_ENGAGEMENT_MS = 90 * 1000;
export const OFFER_COOLDOWN_MS = 45 * 1000;
