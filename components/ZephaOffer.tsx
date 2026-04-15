import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { ZEPHA_SIZE } from '@/lib/zepha/config';
import type { OfferState, Position } from '@/lib/zepha/types';

export function ZephaOffer(props: {
  offerState: OfferState;
  offerAnchor: Position;
  leftWallX: number;
  topWallY: number;
  offerOpacity: Animated.Value;
  offerScale: Animated.Value;
  offerThreadOpacity: Animated.Value;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const {
    offerState,
    offerAnchor,
    leftWallX,
    topWallY,
    offerOpacity,
    offerScale,
    offerThreadOpacity,
    onPress,
    onLongPress,
  } = props;

  if (!offerState.visible) {
    return null;
  }

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.offerThread,
          {
            opacity: offerThreadOpacity,
            left: leftWallX + ZEPHA_SIZE / 2,
            top: topWallY + 18,
            width: Math.max(1, offerAnchor.x - (leftWallX + ZEPHA_SIZE / 2)),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.offerObject,
          {
            left: offerAnchor.x,
            top: offerAnchor.y,
            opacity: offerOpacity,
            transform: [{ scale: offerScale }],
          },
        ]}
      >
        <Pressable onPress={onPress} onLongPress={onLongPress}>
          <Text style={styles.offerObjectText}>♡</Text>
          <Text style={styles.offerLabel}>{offerState.label}</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  offerThread: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(252, 211, 77, 0.55)',
    borderRadius: 999,
  },
  offerObject: {
    position: 'absolute',
    marginLeft: -18,
    marginTop: -18,
    alignItems: 'center',
  },
  offerObjectText: {
    color: '#fcd34d',
    fontSize: 22,
    textAlign: 'center',
  },
  offerLabel: {
    color: '#fde68a',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});