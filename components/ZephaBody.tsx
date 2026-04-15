import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { STATE_CONFIG, ZEPHA_SIZE } from '@/lib/zepha/config';
import { STATES } from '@/lib/zepha/states';
import type { ZephaBodyMotion, ZephaState } from '@/lib/zepha/types';

export function ZephaBody(props: {
  motion: ZephaBodyMotion;
  trueState: ZephaState;
  brainReason: string;
  onPress: () => void;
}) {
  const { motion, trueState, brainReason, onPress } = props;

  const silkHeight = Animated.subtract(motion.posY, motion.topWallY + 40);
  const zephaTranslateX =
    motion.visibleState === STATES.WATCH
      ? Animated.add(motion.posX, motion.watchNudge)
      : motion.visibleState === STATES.CURIOUS
        ? Animated.add(motion.posX, motion.curiousNudge)
        : motion.posX;

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
  },
});