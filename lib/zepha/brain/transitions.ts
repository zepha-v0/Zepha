import { PRODUCT_CONFIG, STATE_CONFIG } from '../config';
import { STATES } from '../states';
import type {
  GuardVisualUrgency,
  VisibleMotion,
  VisibleTransitionPlan,
  VisibleTransitionPolicyArgs,
  ZephaConfidence,
  ZephaContext,
  ZephaSignals,
  ZephaState,
} from '../types';

export const VALID_TRANSITIONS: Record<ZephaState, ZephaState[]> = {
  [STATES.SLEEP]: [STATES.LIGHT_WAKE],
  [STATES.LIGHT_WAKE]: [STATES.WAKE, STATES.SLEEP, STATES.GUARD],
  [STATES.WAKE]: [STATES.IDLE, STATES.CURIOUS, STATES.GUARD],
  [STATES.IDLE]: [STATES.CURIOUS, STATES.GUARD, STATES.SLEEP],
  [STATES.CURIOUS]: [STATES.GUARD, STATES.IDLE],
  [STATES.GUARD]: [STATES.WATCH],
  [STATES.WATCH]: [STATES.GUARD, STATES.IDLE, STATES.CURIOUS, STATES.SLEEP],
};

export function isTransitionAllowed(from: ZephaState, to: ZephaState) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canLeaveState(current: ZephaState, next: ZephaState, stateEnteredAt: number, now: number) {
  if (current === next) return false;
  if (!isTransitionAllowed(current, next)) return false;

  const dwell = now - stateEnteredAt;

  if (current === STATES.LIGHT_WAKE && dwell < STATE_CONFIG[STATES.LIGHT_WAKE].minDwellMs) {
    if (next !== STATES.GUARD) return false;
  }
  if (current === STATES.GUARD && dwell < STATE_CONFIG[STATES.GUARD].minDwellMs) {
    return false;
  }
  if (current === STATES.WATCH && dwell < STATE_CONFIG[STATES.WATCH].minDwellMs) {
    if (next !== STATES.GUARD && next !== STATES.WATCH) return false;
  }
  if (current === STATES.CURIOUS && dwell < STATE_CONFIG[STATES.CURIOUS].minDwellMs) {
    if (next !== STATES.GUARD && next !== STATES.CURIOUS) return false;
  }

  return true;
}

export function getGuardVisualUrgency(
  signals: ZephaSignals,
  context: ZephaContext,
  confidence: ZephaConfidence
): GuardVisualUrgency {
  if (signals.manualUrgency && confidence.guard >= PRODUCT_CONFIG.confidence.guardExtreme) {
    return 'extreme';
  }

  if (signals.manualUrgency || confidence.guard >= PRODUCT_CONFIG.confidence.guardImmediate) {
    return 'urgent';
  }

  if (context.guardIntentActive && confidence.guard >= PRODUCT_CONFIG.confidence.guardCommit) {
    return 'measured';
  }

  return 'measured';
}

export function shouldBridgeIntoGuard(args: {
  fromVisibleState: ZephaState;
  urgency: GuardVisualUrgency;
  confidence: ZephaConfidence;
}) {
  const { fromVisibleState, urgency, confidence } = args;

  if (urgency === 'extreme') {
    return false;
  }

  if (fromVisibleState === STATES.CURIOUS) {
    return false;
  }

  if (fromVisibleState === STATES.WATCH) {
    return urgency !== 'urgent';
  }

  if (urgency === 'measured') {
    return true;
  }

  return confidence.guard < PRODUCT_CONFIG.visiblePolicy.preferCuriousBridgeBelow;
}

export function buildVisibleTransitionPlan(args: VisibleTransitionPolicyArgs): VisibleTransitionPlan {
  const { fromVisibleState, toTrueState, signals, context, confidence } = args;
  const urgency = getGuardVisualUrgency(signals, context, confidence);
  const steps: VisibleTransitionPlan['steps'] = [];

  const pushStep = (motion: VisibleMotion, state: ZephaState, note: string) => {
    const previous = steps[steps.length - 1];
    if (previous && previous.motion === motion && previous.state === state) return;
    steps.push({ motion, state, note });
  };

  if (fromVisibleState === toTrueState) {
    return { reason: 'already aligned', steps };
  }

  if (toTrueState === STATES.GUARD) {
    const bridgeThroughCurious = shouldBridgeIntoGuard({
      fromVisibleState,
      urgency,
      confidence,
    });

    if (fromVisibleState === STATES.SLEEP) {
      pushStep('light_wake', STATES.LIGHT_WAKE, 'wake gently');
      pushStep('wake_to_idle', STATES.IDLE, 'descend to the lower edge');
      if (bridgeThroughCurious || confidence.guard < PRODUCT_CONFIG.visiblePolicy.urgentWakeGuardBelow) {
        pushStep('curious', STATES.CURIOUS, 'read the room before protecting');
      }
      pushStep('guard', STATES.GUARD, 'settle into protection');
      return { reason: 'sleep-to-guard staged wake', steps };
    }

    if (fromVisibleState === STATES.LIGHT_WAKE) {
      pushStep('wake_to_idle', STATES.IDLE, 'finish waking before moving');
      if (bridgeThroughCurious) {
        pushStep('curious', STATES.CURIOUS, 'acknowledge the moment before committing');
      }
      pushStep('guard', STATES.GUARD, 'arrive steady at guard');
      return { reason: 'light-wake to guard', steps };
    }

    if (fromVisibleState === STATES.WAKE || fromVisibleState === STATES.IDLE) {
      if (bridgeThroughCurious) {
        pushStep('curious', STATES.CURIOUS, 'take a recognition beat before guard');
      }
      pushStep('guard', STATES.GUARD, 'protect without rushing');
      return { reason: 'idle-to-guard bridge', steps };
    }

    if (fromVisibleState === STATES.CURIOUS) {
      pushStep('guard', STATES.GUARD, 'curiosity resolves into protection');
      return { reason: 'curious-to-guard resolve', steps };
    }

    if (fromVisibleState === STATES.WATCH && bridgeThroughCurious) {
      pushStep('curious', STATES.CURIOUS, 're-read the moment before recommitting');
      pushStep('guard', STATES.GUARD, 'settle back into protection');
      return { reason: 'watch-to-guard bridge', steps };
    }
    pushStep('guard', STATES.GUARD, 'snap back to protection logic, stay calm visually');
    return { reason: 'direct guard alignment', steps };
  }

  if (toTrueState === STATES.WATCH) {
    pushStep('watch', STATES.WATCH, 'release guard without disappearing');
    return { reason: 'guard decompresses into watch', steps };
  }

  if (toTrueState === STATES.IDLE) {
    if (fromVisibleState === STATES.GUARD) {
      pushStep('watch', STATES.WATCH, 'guard must exhale through watch');
      pushStep('curious', STATES.CURIOUS, 'linger in soft noticing before settling');
    } else if (fromVisibleState === STATES.WATCH) {
      pushStep('curious', STATES.CURIOUS, 'release intensity through a reading beat');
    }
    pushStep('idle', STATES.IDLE, 'return to the calm edge');
    return { reason: 'idle baseline', steps };
  }

  if (toTrueState === STATES.CURIOUS) {
    if (fromVisibleState === STATES.SLEEP) {
      pushStep('light_wake', STATES.LIGHT_WAKE, 'wake gently');
      pushStep('wake_to_idle', STATES.IDLE, 'descend to the lower edge');
    } else if (fromVisibleState === STATES.GUARD) {
      pushStep('watch', STATES.WATCH, 'release intensity before deciding');
    }
    pushStep('curious', STATES.CURIOUS, 'read the moment');
    return { reason: 'curious reading layer', steps };
  }

  if (toTrueState === STATES.SLEEP) {
    if (fromVisibleState === STATES.GUARD) {
      pushStep('watch', STATES.WATCH, 'release guard first');
      pushStep('curious', STATES.CURIOUS, 'make sure the moment is really over');
      pushStep('idle', STATES.IDLE, 'settle before sleep');
    } else if (fromVisibleState === STATES.WATCH) {
      pushStep('curious', STATES.CURIOUS, 'let the edge attention soften');
      pushStep('idle', STATES.IDLE, 'come back to the edge');
    } else if (fromVisibleState === STATES.CURIOUS) {
      pushStep('idle', STATES.IDLE, 'come back to the edge');
    }
    pushStep('sleep', STATES.SLEEP, 'return to the web');
    return { reason: 'sleep wind-down', steps };
  }

  if (toTrueState === STATES.LIGHT_WAKE) {
    pushStep('light_wake', STATES.LIGHT_WAKE, 'light wake acknowledgement');
    return { reason: 'light wake', steps };
  }

  if (toTrueState === STATES.WAKE) {
    pushStep('wake_to_idle', STATES.IDLE, 'wake and descend');
    return { reason: 'wake transition', steps };
  }

  pushStep('idle', STATES.IDLE, 'fallback calm baseline');
  return { reason: 'fallback visible alignment', steps };
}
