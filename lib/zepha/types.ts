import type { AppStateStatus, Animated } from 'react-native';

import { STATES } from './states';

export type ZephaState = (typeof STATES)[keyof typeof STATES];
export type ActivityLevel = 'still' | 'light' | 'active';
export type WakeMode = 'none' | 'light' | 'full';

export type ZephaSignals = {
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
  manualGuard: boolean;
  relevantPrepExists: boolean;
  firstRunLearningMode: boolean;
};

export type ZephaContext = {
  inactivityMs: number;
  sessionDurationMs: number;
  interactionsLast10s: number;
  interactionsLast60s: number;
  activityLevel: ActivityLevel;
  sustainedEngagement: boolean;
  wakeWindowActive: boolean;
  lightWakeWindowActive: boolean;
  sleepEligible: boolean;
  workIntentActive: boolean;
  guardIntentActive: boolean;
  offerIntentActive: boolean;
  shouldDecompress: boolean;
  wakeMode: WakeMode;
};

export type ZephaConfidence = {
  sleep: number;
  idle: number;
  curious: number;
  guard: number;
  watch: number;
  offer: number;
};

export type BrainDecision = {
  nextState: ZephaState;
  reason: string;
};

export type ZephaMemory = {
  guardWins: number;
  idleWins: number;
  curiousWins: number;
  watchWins: number;
  workSessionCount: number;
  calmSessionCount: number;
  workGuardBias: number;
  calmIdleBias: number;
  watchCarryBias: number;
  offerPrepBias: number;
  recentGuardAt: number | null;
  recentWatchAt: number | null;
  recentIdleAt: number | null;
  recentCuriousAt: number | null;
  recentWorkIntentAt: number | null;
  recentUrgencyAt: number | null;
  recentOfferAt: number | null;
  offerDismissedAt: number | null;
  lastDecisionReason: string;
};

export type OfferState = {
  visible: boolean;
  activeOfferId: string | null;
  label: string;
};

export type StoredOfferStatus = 'pending' | 'accepted' | 'declined';
export type StoredOfferType = 'note';
export type StoredOfferUrgency = 'normal' | 'urgent';

export type StoredOffer = {
  id: string;
  type: StoredOfferType;
  title: string;
  body: string;
  priority: number;
  urgency: StoredOfferUrgency;
  createdAt: number;
  status: StoredOfferStatus;
  respondedAt: number | null;
};

export type GuardVisualUrgency = 'measured' | 'urgent' | 'extreme';
export type VisibleMotion =
  | 'sleep'
  | 'light_wake'
  | 'wake_to_idle'
  | 'idle'
  | 'curious'
  | 'guard'
  | 'watch';

export type VisibleTransitionStep = {
  motion: VisibleMotion;
  state: ZephaState;
  note: string;
};

export type VisibleTransitionPlan = {
  reason: string;
  steps: VisibleTransitionStep[];
};

export type Position = {
  x: number;
  y: number;
};

export type ZephaPositions = {
  leftWallX: number;
  rightWallX: number;
  topWallY: number;
  bottomWallY: number;
  getSleepPosition: () => Position;
  getLightWakePosition: () => Position;
  getIdleHomePosition: () => Position;
  getGuardPosition: () => Position;
  getWatchPosition: () => Position;
  getCuriousPosition: () => Position;
  getGuardMidwayPosition: () => Position;
  getOfferAnchor: () => Position;
};

export type VisibleTransitionPolicyArgs = {
  fromVisibleState: ZephaState;
  toTrueState: ZephaState;
  signals: ZephaSignals;
  context: ZephaContext;
  confidence: ZephaConfidence;
};

export type RunVisibleTransitionArgs = {
  toTrueState: ZephaState;
  signals: ZephaSignals;
  context: ZephaContext;
  confidence: ZephaConfidence;
};

export type ZephaBodyMotion = {
  visibleState: ZephaState;
  showSilk: boolean;
  posX: Animated.Value;
  posY: Animated.Value;
  scale: Animated.Value;
  idleFloat: Animated.Value;
  zzzOpacity: Animated.Value;
  webOpacity: Animated.Value;
  silkOpacity: Animated.Value;
  blinkScaleY: Animated.Value;
  watchNudge: Animated.Value;
  curiousNudge: Animated.Value;
  leftWallX: number;
  topWallY: number;
};
