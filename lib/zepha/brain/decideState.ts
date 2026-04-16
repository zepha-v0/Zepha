import { PRODUCT_CONFIG, SOFT_INACTIVITY_MS, WATCH_TO_IDLE_MS } from '../config';
import { STATES } from '../states';
import type { BrainDecision, ZephaConfidence, ZephaContext, ZephaSignals, ZephaState } from '../types';

export function decideZephaState(
  currentState: ZephaState,
  signals: ZephaSignals,
  context: ZephaContext,
  confidence: ZephaConfidence,
  offerVisible: boolean
): BrainDecision {
  const guardIsImmediate =
    confidence.guard >= PRODUCT_CONFIG.confidence.guardImmediate || signals.manualUrgency;
  const guardIsCommitted =
    confidence.guard >= PRODUCT_CONFIG.confidence.guardCommit && context.guardIntentActive;
  const curiousAllowed = !signals.firstRunLearningMode;
  const curiousHasMomentum =
    curiousAllowed &&
    confidence.curious >= PRODUCT_CONFIG.confidence.curiousBaseline &&
    confidence.guard < PRODUCT_CONFIG.confidence.guardImmediate;

  if (context.sleepEligible) {
    return { nextState: STATES.SLEEP, reason: 'sleep eligible after long inactivity' };
  }

  if (currentState === STATES.SLEEP) {
    if (context.guardIntentActive) {
      return { nextState: STATES.LIGHT_WAKE, reason: 'sleep acknowledged urgent wake' };
    }
    if (context.lightWakeWindowActive) {
      return { nextState: STATES.LIGHT_WAKE, reason: 'foreground light wake' };
    }
    return { nextState: STATES.SLEEP, reason: 'remain asleep' };
  }

  if (currentState === STATES.LIGHT_WAKE) {
    if (guardIsImmediate) {
      return { nextState: STATES.GUARD, reason: 'light wake escalated to guard' };
    }
    if (!context.wakeWindowActive && context.inactivityMs > SOFT_INACTIVITY_MS) {
      return { nextState: STATES.SLEEP, reason: 'light wake faded back to sleep' };
    }
    if (guardIsCommitted && context.wakeWindowActive) {
      return { nextState: STATES.WAKE, reason: 'light wake preparing deliberate guard wake' };
    }
    if (context.wakeWindowActive && context.activityLevel !== 'still') {
      return { nextState: STATES.WAKE, reason: 'interaction committed wake' };
    }
    if (context.wakeWindowActive && context.wakeMode === 'full') {
      return { nextState: STATES.WAKE, reason: 'light wake committed to full wake' };
    }
    return { nextState: STATES.LIGHT_WAKE, reason: 'remain half-awake' };
  }

  if (currentState === STATES.WAKE) {
    if (guardIsImmediate) {
      return { nextState: STATES.GUARD, reason: 'wake escalated to immediate guard' };
    }
    if (curiousHasMomentum && !context.guardIntentActive) {
      return { nextState: STATES.CURIOUS, reason: 'wake reading the room before settling' };
    }
    if (guardIsCommitted && !context.wakeWindowActive) {
      return { nextState: STATES.GUARD, reason: 'wake committed to guard after decision beat' };
    }
    if (context.wakeWindowActive) {
      return { nextState: STATES.WAKE, reason: 'wake grace window' };
    }
    if (curiousAllowed && confidence.curious >= PRODUCT_CONFIG.confidence.curiousBridge) {
      return { nextState: STATES.CURIOUS, reason: 'wake resolving into curiosity' };
    }
    return { nextState: STATES.IDLE, reason: 'wake settled to idle' };
  }

  if (currentState === STATES.GUARD) {
    if (guardIsCommitted || confidence.guard >= 0.5 || context.guardIntentActive) {
      return { nextState: STATES.GUARD, reason: 'maintain guard' };
    }
    return { nextState: STATES.WATCH, reason: 'guard released to watch' };
  }

  if (currentState === STATES.WATCH) {
    if (guardIsImmediate) {
      return { nextState: STATES.GUARD, reason: 'watch resumed guard' };
    }
    if (curiousHasMomentum && confidence.guard < PRODUCT_CONFIG.confidence.guardCommit) {
      return { nextState: STATES.CURIOUS, reason: 'watch softened into curiosity' };
    }
    if (
      context.inactivityMs > WATCH_TO_IDLE_MS ||
      confidence.idle >= PRODUCT_CONFIG.confidence.idleCalm
    ) {
      return { nextState: STATES.IDLE, reason: 'watch cooled to idle' };
    }
    if (guardIsCommitted) {
      return { nextState: STATES.GUARD, reason: 'watch recommitted to guard after pause' };
    }
    return { nextState: STATES.WATCH, reason: 'continue watch' };
  }

  if (guardIsImmediate) {
    return { nextState: STATES.GUARD, reason: 'high guard confidence' };
  }
  if (confidence.sleep >= 0.7) {
    return { nextState: STATES.SLEEP, reason: 'sleep confidence high' };
  }
  if (offerVisible) {
    if (confidence.idle >= 0.66 && context.activityLevel === 'still' && confidence.curious < 0.48) {
      return { nextState: STATES.IDLE, reason: 'offer present while body stays calm' };
    }
    return { nextState: STATES.CURIOUS, reason: 'offer present while reading moment' };
  }
  if (confidence.watch >= PRODUCT_CONFIG.confidence.watchCarry && context.shouldDecompress) {
    if (curiousHasMomentum && confidence.watch < 0.72) {
      return { nextState: STATES.CURIOUS, reason: 'post-intensity decompression favors curiosity' };
    }
    return { nextState: STATES.WATCH, reason: 'post-intensity watch carry' };
  }
  if (guardIsCommitted) {
    return { nextState: STATES.GUARD, reason: 'measured guard confidence' };
  }
  if (curiousHasMomentum) {
    return { nextState: STATES.CURIOUS, reason: 'medium uncertainty curiosity' };
  }

  return { nextState: STATES.IDLE, reason: 'calm baseline certainty' };
}
