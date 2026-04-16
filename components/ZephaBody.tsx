import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { STATE_CONFIG, ZEPHA_SIZE } from '@/lib/zepha/config';
import { STATES } from '@/lib/zepha/states';
import type { ZephaBodyMotion, ZephaState } from '@/lib/zepha/types';

export function ZephaBody(props: {
  motion: ZephaBodyMotion;
  trueState: ZephaState;
  brainReason: string;
  glyphSignal: {
    id: string;
    symbol: string;
    variant: 'curious' | 'watch' | 'guard' | 'offer';
  } | null;
  onPress: () => void;
}) {
  const { motion, trueState, brainReason, glyphSignal, onPress } = props;
  const glyphOpacity = useRef(new Animated.Value(0)).current;
  const glyphScale = useRef(new Animated.Value(0.96)).current;
  const glyphRise = useRef(new Animated.Value(6)).current;
  const glyphWiggle = useRef(new Animated.Value(0)).current;

  const silkHeight = Animated.subtract(motion.posY, motion.topWallY + 40);
  const zephaTranslateX =
    motion.visibleState === STATES.WATCH
      ? Animated.add(motion.posX, motion.watchNudge)
      : motion.visibleState === STATES.CURIOUS
        ? Animated.add(motion.posX, motion.curiousNudge)
        : motion.posX;
  const glyphTranslateX = Animated.add(zephaTranslateX, 30);
  const glyphTranslateY = Animated.add(
    Animated.add(motion.posY, motion.idleFloat),
    -6
  );

  useEffect(() => {
    glyphOpacity.stopAnimation();
    glyphScale.stopAnimation();
    glyphRise.stopAnimation();
    glyphWiggle.stopAnimation();

    if (!glyphSignal) {
      Animated.parallel([
        Animated.timing(glyphOpacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glyphRise, {
          toValue: 8,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    glyphOpacity.setValue(0);
    glyphScale.setValue(glyphSignal.variant === 'guard' ? 0.98 : 0.96);
    glyphRise.setValue(6);
    glyphWiggle.setValue(0);

    const entry = Animated.parallel([
      Animated.timing(glyphOpacity, {
        toValue: glyphSignal.variant === 'guard' ? 0.92 : 0.84,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glyphScale, {
        toValue: glyphSignal.variant === 'guard' ? 1.02 : 1,
        duration: glyphSignal.variant === 'guard' ? 180 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glyphRise, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    let accent: Animated.CompositeAnimation;
    if (glyphSignal.variant === 'curious') {
      accent = Animated.sequence([
        Animated.timing(glyphWiggle, {
          toValue: 2,
          duration: 120,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glyphWiggle, {
          toValue: -2,
          duration: 160,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glyphWiggle, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    } else if (glyphSignal.variant === 'watch') {
      accent = Animated.sequence([
        Animated.timing(glyphScale, {
          toValue: 1.03,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glyphScale, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    } else if (glyphSignal.variant === 'guard') {
      accent = Animated.sequence([
        Animated.timing(glyphScale, {
          toValue: 1.05,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glyphScale, {
          toValue: 1.01,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    } else {
      accent = Animated.sequence([
        Animated.timing(glyphRise, {
          toValue: -2,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glyphRise, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
    }

    Animated.sequence([entry, accent]).start();
  }, [
    glyphOpacity,
    glyphRise,
    glyphScale,
    glyphSignal,
    glyphWiggle,
  ]);

  return (
    <>
      <Text style={styles.text}>{STATE_CONFIG[motion.visibleState].label}</Text>
      <Text style={styles.subtext}>brain: {brainReason}</Text>
      <Text style={styles.subtext}>trueState: {trueState}</Text>

      {(motion.visibleState === STATES.SLEEP ||
        motion.visibleState === STATES.LIGHT_WAKE ||
        motion.visibleState === STATES.WAKE) && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sleepWeb,
            {
              opacity: motion.webOpacity,
              left: motion.leftWallX + 18,
              top: motion.topWallY - 2,
            },
          ]}
        >
          <Text style={styles.sleepWebText}>✧╱╲✧</Text>
        </Animated.View>
      )}

      {motion.showSilk && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.silk,
            {
              opacity: motion.silkOpacity,
              left: motion.leftWallX + ZEPHA_SIZE / 2,
              top: motion.topWallY + 38,
              height: silkHeight,
            },
          ]}
        />
      )}

      {(motion.visibleState === STATES.SLEEP ||
        motion.visibleState === STATES.LIGHT_WAKE ||
        motion.visibleState === STATES.WAKE) && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.zzzWrap,
            {
              opacity: motion.zzzOpacity,
              transform: [
                { translateX: Animated.add(motion.posX, 44) },
                { translateY: Animated.add(motion.posY, -14) },
              ],
            },
          ]}
        >
          <Text style={styles.zzz}>Zzz</Text>
        </Animated.View>
      )}

      {glyphSignal && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glyphWrap,
            {
              opacity: glyphOpacity,
              transform: [
                { translateX: Animated.add(glyphTranslateX, glyphWiggle) },
                { translateY: Animated.add(glyphTranslateY, glyphRise) },
                { scale: glyphScale },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.glyphText,
              glyphSignal.variant === 'guard'
                ? styles.guardGlyph
                : glyphSignal.variant === 'offer'
                  ? styles.offerGlyph
                  : glyphSignal.variant === 'watch'
                    ? styles.watchGlyph
                    : styles.curiousGlyph,
            ]}
          >
            {glyphSignal.symbol}
          </Text>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.zepha,
          {
            transform: [
              { translateX: zephaTranslateX },
              { translateY: Animated.add(motion.posY, motion.idleFloat) },
              { scale: motion.scale },
              { scaleY: motion.blinkScaleY },
            ],
          },
        ]}
      >
        <Pressable onPress={onPress}>
          <Text style={styles.spider}>🕷️</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#dbeafe',
    marginTop: 22,
    fontSize: 16,
    textAlign: 'center',
  },
  subtext: {
    color: '#94a3b8',
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  zepha: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 3,
  },
  spider: {
    fontSize: ZEPHA_SIZE,
  },
  zzzWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  zzz: {
    color: '#c4b5fd',
    fontSize: 18,
    opacity: 0.9,
  },
  sleepWeb: {
    position: 'absolute',
    zIndex: 1,
  },
  sleepWebText: {
    color: '#93c5fd',
    fontSize: 14,
    opacity: 0.65,
  },
  silk: {
    position: 'absolute',
    width: 1.5,
    backgroundColor: 'rgba(200, 220, 255, 0.55)',
    borderRadius: 999,
    zIndex: 2,
  },
  glyphWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 4,
  },
  glyphText: {
    color: 'rgba(226, 232, 240, 0.86)',
    fontSize: 20,
    lineHeight: 20,
    textShadowColor: 'rgba(8, 18, 56, 0.35)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },
  curiousGlyph: {
    color: 'rgba(226, 232, 240, 0.82)',
  },
  watchGlyph: {
    color: 'rgba(203, 213, 225, 0.86)',
    letterSpacing: -1,
  },
  guardGlyph: {
    color: 'rgba(241, 245, 249, 0.92)',
    fontSize: 18,
    lineHeight: 18,
  },
  offerGlyph: {
    color: 'rgba(196, 181, 253, 0.84)',
  },
});
