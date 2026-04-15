import { STATES } from './states';

export const STATE_CONFIG = {
  [STATES.SLEEP]: {
    label: 'sleeping',
    priority: 0,
  },
  [STATES.LIGHT_WAKE]: {
    label: 'half-awake',
    priority: 1,
    minDwellMs: 4000,
    blinkPauseMs: 2600,
  },
  [STATES.WAKE]: {
    label: 'waking',
    priority: 2,
    zzzFadeDuration: 1000,
    stretchDurationIn: 900,
    stretchDurationOut: 1000,
    descendDuration: 5200,
    stretchScale: 1.06,
    graceMs: 18000,
  },
  [STATES.IDLE]: {
    label: 'just existing',
    priority: 3,
    moveDurationMin: 90000,
    moveDurationMax: 180000,
    pauseMin: 6000,
    pauseMax: 12000,
    floatAmount: 0.25,
  },
  [STATES.CURIOUS]: {
    label: 'noticing',
    priority: 4,
    minDwellMs: 22000,
    scanAmount: 5,
    scanForwardDuration: 7000,
    scanBackDuration: 8500,
    lingerDuration: 2200,
    enterDuration: 5200,
  },
  [STATES.GUARD]: {
    label: 'holding for you',
    priority: 7,
    decisionPause: 1000,
    meanderPause: 900,
    moveDurationPhase1: 5000,
    moveDurationPhase2: 7200,
    settlePause: 1200,
    settleScalePeak: 1.04,
    settleScaleRest: 1.02,
    minDwellMs: 26000,
  },
  [STATES.WATCH]: {
    label: 'watching',
    priority: 6,
    minDwellMs: 22000,
    scanAmount: 8,
    scanForwardDuration: 5200,
    scanBackDuration: 6800,
    lingerDuration: 1800,
    enterDuration: 3600,
  },
} as const;

export const PRODUCT_CONFIG = {
  confidence: {
    curiousBaseline: 0.4,
    curiousBridge: 0.34,
    guardCommit: 0.68,
    guardImmediate: 0.84,
    guardExtreme: 0.92,
    watchCarry: 0.5,
    idleCalm: 0.64,
  },
  visiblePolicy: {
    preferCuriousBridgeBelow: 0.96,
    urgentWakeGuardBelow: 0.97,
  },
} as const;

export const ZEPHA_SIZE = 90;
export const EDGE_MARGIN = 10;
export const BOTTOM_UI_OFFSET = 8;

export const LONG_INACTIVITY_MS = 45 * 60 * 1000;
export const SOFT_INACTIVITY_MS = 75 * 1000;
export const CURIOUS_TRIGGER_MS = 12 * 1000;
export const WATCH_TO_IDLE_MS = 28 * 1000;
export const WAKE_WINDOW_MS = 18 * 1000;
export const LIGHT_WAKE_WINDOW_MS = 8 * 1000;
export const SUSTAINED_ENGAGEMENT_MS = 90 * 1000;
export const OFFER_COOLDOWN_MS = 45 * 1000;