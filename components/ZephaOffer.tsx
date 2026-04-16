import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { ZEPHA_SIZE } from '@/lib/zepha/config';
import type { OfferState, Position, StoredOffer } from '@/lib/zepha/types';

export function ZephaOffer(props: {
  offerState: OfferState;
  offer: StoredOffer | null;
  offerAnchor: Position;
  leftWallX: number;
  topWallY: number;
  offerOpacity: Animated.Value;
  offerScale: Animated.Value;
  offerThreadOpacity: Animated.Value;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const {
    offerState,
    offer,
    offerAnchor,
    leftWallX,
    topWallY,
    offerOpacity,
    offerScale,
    offerThreadOpacity,
    onAccept,
    onDecline,
  } = props;

  if (!offerState.visible || !offer) {
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
          styles.card,
          {
            left: Math.max(leftWallX + 110, offerAnchor.x - 150),
            top: offerAnchor.y + 18,
            opacity: offerOpacity,
            transform: [{ scale: offerScale }],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardBadge}>{offerState.label}</Text>
          <Text style={styles.cardStatus}>{offer.status}</Text>
        </View>
        <Text style={styles.cardTitle}>{offer.title}</Text>
        <Text style={styles.cardBody}>{offer.body}</Text>
        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
            <Text style={styles.actionText}>Accept</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.declineButton]} onPress={onDecline}>
            <Text style={styles.actionText}>Decline</Text>
          </Pressable>
        </View>
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
    zIndex: 5,
  },
  card: {
    position: 'absolute',
    width: 220,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.3)',
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    zIndex: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadge: {
    color: '#fde68a',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardStatus: {
    color: '#94a3b8',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
  },
  cardBody: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  acceptButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  declineButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  actionText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
});
