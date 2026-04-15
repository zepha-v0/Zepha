import type { ZephaContext, ZephaMemory, ZephaSignals, ZephaState } from '../types';
import { STATES } from '../states';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function createInitialMemory(): ZephaMemory {
  return {
    guardWins: 0,
    idleWins: 0,
    curiousWins: 0,
    watchWins: 0,
    workSessionCount: 0,
    calmSessionCount: 0,
    workGuardBias: 0,
    calmIdleBias: 0,
    watchCarryBias: 0,
    offerPrepBias: 0,
    recentGuardAt: null,
    recentWatchAt: null,
    recentIdleAt: null,
    recentCuriousAt: null,
    recentWorkIntentAt: null,
    recentUrgencyAt: null,
    recentOfferAt: null,
    offerDismissedAt: null,
    lastDecisionReason: 'initial',
  };
}

export function noteWorkIntent(memory: ZephaMemory, now: number) {
  memory.recentWorkIntentAt = now;
}

export function noteUrgency(memory: ZephaMemory, now: number) {
  memory.recentUrgencyAt = now;
}

export function reinforceMemory(
  memory: ZephaMemory,
  state: ZephaState,
  dwellMs: number,
  currentSignals: ZephaSignals,
  currentContext: ZephaContext,
  reason: string
) {
  const now = currentSignals.now;

  memory.lastDecisionReason = reason;

  if (currentSignals.manualWorkIntent || currentSignals.meetingSoon || currentSignals.focusMode) {
    memory.recentWorkIntentAt = now;
  }
  if (currentSignals.manualUrgency) {
    memory.recentUrgencyAt = now;
  }

  if (state === STATES.GUARD) {
    memory.recentGuardAt = now;
    if (dwellMs >= 12_000) memory.guardWins += 1;
    if (currentContext.workIntentActive) {
      memory.workSessionCount += 1;
      memory.workGuardBias = clamp01(memory.workGuardBias + 0.03);
    }
  }

  if (state === STATES.WATCH) {
    memory.recentWatchAt = now;
    if (dwellMs >= 10_000) {
      memory.watchWins += 1;
      memory.watchCarryBias = clamp01(memory.watchCarryBias + 0.025);
    }
  }

  if (state === STATES.IDLE) {
    memory.recentIdleAt = now;
    if (dwellMs >= 20_000 && currentContext.activityLevel === 'still') {
      memory.idleWins += 1;
      memory.calmSessionCount += 1;
      memory.calmIdleBias = clamp01(memory.calmIdleBias + 0.03);
    }
  }

  if (state === STATES.CURIOUS) {
    memory.recentCuriousAt = now;
    if (dwellMs >= 10_000) memory.curiousWins += 1;
  }

  memory.workGuardBias = clamp01(memory.workGuardBias * 0.9985);
  memory.calmIdleBias = clamp01(memory.calmIdleBias * 0.9988);
  memory.watchCarryBias = clamp01(memory.watchCarryBias * 0.9988);
  memory.offerPrepBias = clamp01(memory.offerPrepBias * 0.9988);
}