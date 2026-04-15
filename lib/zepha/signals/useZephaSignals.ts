import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { ZephaSignals } from '../types';

export function useZephaSignals(params: {
  focusMode: boolean;
  meetingSoon: boolean;
  manualWorkIntent: boolean;
  manualUrgency: boolean;
  relevantPrepExists: boolean;
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
    forceRender((value) => value + 1);
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
      }

      forceRender((value) => value + 1);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      pruneInteractions(Date.now());
      forceRender((value) => value + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const signals: ZephaSignals = {
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
    relevantPrepExists: params.relevantPrepExists,
    firstRunLearningMode: params.firstRunLearningMode,
  };

  return {
    signals,
    markInteraction,
    lastInteractionAt,
  };
}