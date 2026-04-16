import {
  LIGHT_WAKE_WINDOW_MS,
  LONG_INACTIVITY_MS,
  SUSTAINED_ENGAGEMENT_MS,
  WAKE_WINDOW_MS,
} from '../config';
import type { ActivityLevel, WakeMode, ZephaContext, ZephaSignals } from '../types';

function countEventsSince(events: number[], now: number, windowMs: number) {
  const cutoff = now - windowMs;
  return events.filter((timestamp) => timestamp >= cutoff).length;
}

export function buildZephaContext(signals: ZephaSignals): ZephaContext {
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

  const wakeWindowActive = signals.appIsActive && sinceForegroundMs <= WAKE_WINDOW_MS;
  const lightWakeWindowActive = signals.appIsActive && sinceForegroundMs <= LIGHT_WAKE_WINDOW_MS;
  const sleepEligible = !signals.appIsActive && inactivityMs >= LONG_INACTIVITY_MS;

  const workIntentActive = signals.focusMode || signals.manualWorkIntent;
  const offerIntentActive = signals.relevantPrepExists && !signals.manualGuard;
  const guardIntentActive =
    signals.focusMode || signals.manualWorkIntent || signals.manualGuard;
  const shouldDecompress =
    !guardIntentActive &&
    (sustainedEngagement || signals.focusMode || signals.manualWorkIntent);

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
    lightWakeWindowActive,
    sleepEligible,
    workIntentActive,
    guardIntentActive,
    offerIntentActive,
    shouldDecompress,
    wakeMode,
  };
}
