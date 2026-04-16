import { CURIOUS_TRIGGER_MS, LONG_INACTIVITY_MS } from '../config';
import type { ZephaConfidence, ZephaContext, ZephaMemory, ZephaSignals } from '../types';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function minutesAgo(now: number, timestamp: number | null, maxMinutes: number) {
  if (!timestamp) return 0;
  const diff = now - timestamp;
  const maxMs = maxMinutes * 60 * 1000;
  if (diff >= maxMs) return 0;
  return clamp01(1 - diff / maxMs);
}

export function scoreZephaConfidence(
  context: ZephaContext,
  signals: ZephaSignals,
  memory: ZephaMemory
): ZephaConfidence {
  let sleep = 0;
  let idle = 0.4;
  let curious = 0.28;
  let guard = 0;
  let watch = 0;
  let offer = 0;

  if (!signals.appIsActive) sleep += 0.25;

  if (context.inactivityMs > 3 * 60 * 1000) {
    sleep += 0.24;
    idle += 0.18;
  }

  if (context.sleepEligible) sleep += 0.5;

  if (context.activityLevel === 'still') {
    idle += 0.2;
    curious += 0.05;
  }

  if (context.activityLevel === 'light') {
    idle += 0.08;
    curious += 0.32;
  }

  if (context.activityLevel === 'active') {
    curious += 0.28;
    watch += 0.05;
  }

  if (context.inactivityMs > CURIOUS_TRIGGER_MS && context.inactivityMs < LONG_INACTIVITY_MS) {
    curious += 0.24;
  }

  if (signals.firstRunLearningMode) {
    curious -= 0.04;
    idle += 0.05;
  }

  if (context.sustainedEngagement) {
    curious += 0.14;
    watch += 0.14;
  }

  if (context.workIntentActive) {
    guard += 0.34;
    curious += 0.04;
    idle -= 0.08;
  }

  if (context.guardIntentActive) {
    guard += 0.24;
    curious += 0.02;
  }

  if (signals.focusMode && signals.manualWorkIntent) {
    guard += 0.14;
  } else if (signals.focusMode || signals.manualWorkIntent) {
    guard += 0.08;
  }

  if (signals.manualGuard) {
    guard += 0.26;
  }

  if (context.offerIntentActive) {
    offer += 0.72;
    curious += 0.12;
    guard -= 0.08;
  }

  if (signals.relevantPrepExists) offer += 0.3;
  if (signals.meetingSoon && signals.relevantPrepExists) offer += 0.12;
  if (context.shouldDecompress) {
    watch += 0.3;
    curious += 0.04;
  }

  const recentGuardStrength = minutesAgo(signals.now, memory.recentGuardAt, 10);
  const recentWatchStrength = minutesAgo(signals.now, memory.recentWatchAt, 8);
  const recentIdleStrength = minutesAgo(signals.now, memory.recentIdleAt, 18);
  const recentCuriousStrength = minutesAgo(signals.now, memory.recentCuriousAt, 12);
  const recentWorkIntentStrength = minutesAgo(signals.now, memory.recentWorkIntentAt, 12);
  const recentUrgencyStrength = minutesAgo(signals.now, memory.recentUrgencyAt, 8);
  const recentOfferStrength = minutesAgo(signals.now, memory.recentOfferAt, 10);

  guard += memory.workGuardBias * 0.24;
  idle += memory.calmIdleBias * 0.28;
  watch += memory.watchCarryBias * 0.24;
  offer += memory.offerPrepBias * 0.24;
  curious += recentCuriousStrength * 0.16;

  if (context.workIntentActive) guard += recentWorkIntentStrength * 0.16;
  if (context.guardIntentActive) guard += recentUrgencyStrength * 0.14;
  if (!context.guardIntentActive && recentGuardStrength > 0) {
    watch += recentGuardStrength * 0.22;
    curious += recentGuardStrength * 0.08;
  }
  if (recentWatchStrength > 0 && !context.guardIntentActive) {
    watch += recentWatchStrength * 0.12;
    curious += recentWatchStrength * 0.07;
  }
  if (recentIdleStrength > 0 && context.activityLevel === 'still') idle += recentIdleStrength * 0.14;
  if (recentOfferStrength > 0 && context.offerIntentActive) offer += recentOfferStrength * 0.12;

  if (memory.guardWins >= 2 && context.workIntentActive) guard += 0.08;
  if (memory.idleWins >= 2 && context.activityLevel === 'still') idle += 0.08;
  if (memory.watchWins >= 2 && context.shouldDecompress) {
    watch += 0.05;
    curious += 0.03;
  }
  if (memory.curiousWins >= 2 && !context.guardIntentActive) curious += 0.06;

  return {
    sleep: clamp01(sleep),
    idle: clamp01(idle),
    curious: clamp01(curious),
    guard: clamp01(guard),
    watch: clamp01(watch),
    offer: clamp01(offer),
  };
}
