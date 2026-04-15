import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useEffectEvent<Args extends unknown[]>(callback: (...args: Args) => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback((...args: Args) => callbackRef.current(...args), []);
}

export function stopLoop(loopRef: React.MutableRefObject<Animated.CompositeAnimation | null>) {
  if (loopRef.current) {
    loopRef.current.stop();
    loopRef.current = null;
  }
}

export function stopAnimatedValues(values: Animated.Value[]) {
  values.forEach((value) => value.stopAnimation());
}

export function animateXY(args: {
  posX: Animated.Value;
  posY: Animated.Value;
  toX: number;
  toY: number;
  duration: number;
  easing: (value: number) => number;
  onComplete?: () => void;
}) {
  const { posX, posY, toX, toY, duration, easing, onComplete } = args;

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
}