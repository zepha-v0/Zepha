import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  OfferState,
  StoredOffer,
  ZephaConfidence,
  ZephaContext,
  ZephaMemory,
  ZephaSignals,
} from '@/lib/zepha/types';

function formatMs(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}m ${rem}s`;
}

export function ZephaDebugPanel(props: {
  showDebug: boolean;
  signals: ZephaSignals;
  context: ZephaContext;
  confidence: ZephaConfidence;
  offerState: OfferState;
  storedOffers: StoredOffer[];
  memory: ZephaMemory;
  validExits: string;
  focusMode: boolean;
  meetingSoon: boolean;
  relevantPrepExists: boolean;
  manualWorkIntent: boolean;
  manualGuard: boolean;
  firstRunLearningMode: boolean;
  onToggleFocusMode: () => void;
  onToggleMeetingSoon: () => void;
  onToggleRelevantPrep: () => void;
  onToggleManualWorkIntent: () => void;
  onToggleManualGuard: () => void;
  onToggleLearningMode: () => void;
  onFakeIdle: () => void;
  onSleep: () => void;
  onSpawnSampleOffer: () => void;
  onSpawnPriorityOffer: () => void;
  onSpawnUrgentOffer: () => void;
  onClearOffers: () => void;
  onResetMemory: () => void;
  onToggleDebug: () => void;
  stateOverride: 'sleep' | 'wake' | 'idle' | 'curious' | 'guard' | 'watch' | 'offer' | null;
  onClearStateOverride: () => void;
  onSetStateOverride: (
    value: 'sleep' | 'wake' | 'idle' | 'curious' | 'guard' | 'watch' | 'offer'
  ) => void;
}) {
  return (
    <>
      <View style={styles.debugBar}>
        <Pressable
          style={[styles.debugButton, props.focusMode && styles.debugButtonActive]}
          onPress={props.onToggleFocusMode}
        >
          <Text style={styles.debugButtonText}>
            {props.focusMode ? 'focus: on' : 'focus: off'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, props.meetingSoon && styles.debugButtonActive]}
          onPress={props.onToggleMeetingSoon}
        >
          <Text style={styles.debugButtonText}>
            {props.meetingSoon ? 'meeting: soon' : 'meeting: no'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, props.relevantPrepExists && styles.debugButtonActive]}
          onPress={props.onToggleRelevantPrep}
        >
          <Text style={styles.debugButtonText}>
            {props.relevantPrepExists ? 'prep: yes' : 'prep: no'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, props.manualWorkIntent && styles.debugButtonActive]}
          onPress={props.onToggleManualWorkIntent}
        >
          <Text style={styles.debugButtonText}>
            {props.manualWorkIntent ? 'work: on' : 'work: off'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, props.manualGuard && styles.debugButtonActive]}
          onPress={props.onToggleManualGuard}
        >
          <Text style={styles.debugButtonText}>
            {props.manualGuard ? 'manual guard: on' : 'manual guard: off'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.debugButton, !props.firstRunLearningMode && styles.debugButtonActive]}
          onPress={props.onToggleLearningMode}
        >
          <Text style={styles.debugButtonText}>
            {props.firstRunLearningMode ? 'learning: soft' : 'learning: full'}
          </Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onFakeIdle}>
          <Text style={styles.debugButtonText}>fake idle</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onSleep}>
          <Text style={styles.debugButtonText}>sleep</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onSpawnSampleOffer}>
          <Text style={styles.debugButtonText}>spawn offer</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onSpawnPriorityOffer}>
          <Text style={styles.debugButtonText}>spawn high</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onSpawnUrgentOffer}>
          <Text style={styles.debugButtonText}>spawn urgent</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onClearOffers}>
          <Text style={styles.debugButtonText}>clear offers</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onResetMemory}>
          <Text style={styles.debugButtonText}>reset memory</Text>
        </Pressable>

        <Pressable style={styles.debugButton} onPress={props.onToggleDebug}>
          <Text style={styles.debugButtonText}>{props.showDebug ? 'hide brain' : 'show brain'}</Text>
        </Pressable>
      </View>

      {props.showDebug && (
        <ScrollView style={styles.debugPanel} contentContainerStyle={styles.debugPanelContent}>
          <Text style={styles.debugTitle}>signals</Text>
          <Text style={styles.debugLine}>app active: {props.signals.appIsActive ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>activity: {props.context.activityLevel}</Text>
          <Text style={styles.debugLine}>wake mode: {props.context.wakeMode}</Text>
          <Text style={styles.debugLine}>inactive: {formatMs(props.context.inactivityMs)}</Text>
          <Text style={styles.debugLine}>session: {formatMs(props.context.sessionDurationMs)}</Text>
          <Text style={styles.debugLine}>10s interactions: {props.context.interactionsLast10s}</Text>
          <Text style={styles.debugLine}>60s interactions: {props.context.interactionsLast60s}</Text>

          <Text style={styles.debugTitle}>context</Text>
          <Text style={styles.debugLine}>sustained: {props.context.sustainedEngagement ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>work intent: {props.context.workIntentActive ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>guard intent: {props.context.guardIntentActive ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>offer intent: {props.context.offerIntentActive ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>wake window: {props.context.wakeWindowActive ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>
            light wake window: {props.context.lightWakeWindowActive ? 'yes' : 'no'}
          </Text>
          <Text style={styles.debugLine}>sleep eligible: {props.context.sleepEligible ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>decompress: {props.context.shouldDecompress ? 'yes' : 'no'}</Text>

          <Text style={styles.debugTitle}>confidence</Text>
          <Text style={styles.debugLine}>sleep: {props.confidence.sleep.toFixed(2)}</Text>
          <Text style={styles.debugLine}>idle: {props.confidence.idle.toFixed(2)}</Text>
          <Text style={styles.debugLine}>curious: {props.confidence.curious.toFixed(2)}</Text>
          <Text style={styles.debugLine}>guard: {props.confidence.guard.toFixed(2)}</Text>
          <Text style={styles.debugLine}>watch: {props.confidence.watch.toFixed(2)}</Text>
          <Text style={styles.debugLine}>offer: {props.confidence.offer.toFixed(2)}</Text>

          <Text style={styles.debugTitle}>offer</Text>
          <Text style={styles.debugLine}>visible: {props.offerState.visible ? 'yes' : 'no'}</Text>
          <Text style={styles.debugLine}>
            active offer id: {props.offerState.activeOfferId ?? 'none'}
          </Text>
          <Text style={styles.debugLine}>label: {props.offerState.label}</Text>

          <Text style={styles.debugTitle}>stored offers</Text>
          {props.storedOffers.length === 0 ? (
            <Text style={styles.debugLine}>no stored offers</Text>
          ) : (
            props.storedOffers.map((offer) => (
              <View key={offer.id} style={styles.offerDebugRow}>
                <Text style={styles.debugLine}>id: {offer.id}</Text>
                <Text style={styles.debugLine}>status: {offer.status}</Text>
                <Text style={styles.debugLine}>priority: {offer.priority}</Text>
                <Text style={styles.debugLine}>urgency: {offer.urgency}</Text>
                <Text style={styles.debugLine}>created: {new Date(offer.createdAt).toLocaleString()}</Text>
                <Text style={styles.debugLine}>
                  responded: {offer.respondedAt ? new Date(offer.respondedAt).toLocaleString() : 'pending'}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.debugTitle}>state override</Text>
          <Text style={styles.debugLine}>active: {props.stateOverride ?? 'none'}</Text>
          <View style={styles.overrideRow}>
            <Pressable style={styles.debugButton} onPress={props.onClearStateOverride}>
              <Text style={styles.debugButtonText}>clear override</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'sleep' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('sleep')}
            >
              <Text style={styles.debugButtonText}>sleep</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'wake' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('wake')}
            >
              <Text style={styles.debugButtonText}>wake</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'idle' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('idle')}
            >
              <Text style={styles.debugButtonText}>idle</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'curious' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('curious')}
            >
              <Text style={styles.debugButtonText}>curious</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'guard' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('guard')}
            >
              <Text style={styles.debugButtonText}>guard</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'watch' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('watch')}
            >
              <Text style={styles.debugButtonText}>watch</Text>
            </Pressable>
            <Pressable
              style={[
                styles.debugButton,
                props.stateOverride === 'offer' && styles.debugButtonActive,
              ]}
              onPress={() => props.onSetStateOverride('offer')}
            >
              <Text style={styles.debugButtonText}>offer</Text>
            </Pressable>
          </View>

          <Text style={styles.debugTitle}>memory</Text>
          <Text style={styles.debugLine}>guard wins: {props.memory.guardWins}</Text>
          <Text style={styles.debugLine}>idle wins: {props.memory.idleWins}</Text>
          <Text style={styles.debugLine}>curious wins: {props.memory.curiousWins}</Text>
          <Text style={styles.debugLine}>watch wins: {props.memory.watchWins}</Text>
          <Text style={styles.debugLine}>
            work guard bias: {props.memory.workGuardBias.toFixed(2)}
          </Text>
          <Text style={styles.debugLine}>calm idle bias: {props.memory.calmIdleBias.toFixed(2)}</Text>
          <Text style={styles.debugLine}>
            watch carry bias: {props.memory.watchCarryBias.toFixed(2)}
          </Text>
          <Text style={styles.debugLine}>
            offer prep bias: {props.memory.offerPrepBias.toFixed(2)}
          </Text>
          <Text style={styles.debugLine}>last decision: {props.memory.lastDecisionReason}</Text>

          <Text style={styles.debugTitle}>valid exits</Text>
          <Text style={styles.debugLine}>{props.validExits}</Text>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  debugBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  debugButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  debugButtonActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.28)',
    borderColor: 'rgba(147, 197, 253, 0.45)',
  },
  debugButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  debugPanel: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 86,
    bottom: 100,
    borderRadius: 18,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  debugPanelContent: {
    padding: 14,
    paddingBottom: 24,
  },
  debugTitle: {
    color: '#bfdbfe',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  debugLine: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4,
  },
  offerDebugRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  overrideRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
});
