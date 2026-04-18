import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { useWalkSession } from '@/hooks/use-walk-session';
import { useBleSession } from '@/hooks/use-ble-session';
import { useEncounterSession } from '@/hooks/use-encounter-session';
import { useWalkPermissions } from '@/hooks/use-walk-permissions';
import { WalkReadyView } from '@/components/walk/WalkReadyView';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkEventActions } from '@/components/walk/WalkEventActions';
import { WalkTopChip } from '@/components/walk/WalkTopChip';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';
import { spacing } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

export default function WalkScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const requestCamera = useWalkStore((s) => s.requestCamera);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();
  const walkSession = useWalkSession();
  const bleSession = useBleSession();
  const encounterSession = useEncounterSession();
  const permissions = useWalkPermissions();
  const insets = useSafeAreaInsets();
  const [isStopping, setIsStopping] = useState(false);

  const selectedDogs = useMemo<Dog[]>(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  // Live Activity の Camera ボタン (Link) からのディープリンク
  // walking-dog://walk?action=camera を受けたら、撮影フローを起動する。
  // cold start 直後は walk-store の hydrate 前で phase === 'ready' / walkId === null
  // になっているため、条件を満たすまで setParams しないで待機し取りこぼしを防ぐ。
  useEffect(() => {
    if (params.action !== 'camera') return;
    if (phase === 'recording' && walkId) {
      requestCamera();
      router.setParams({ action: undefined });
    }
  }, [params.action, phase, walkId, requestCamera]);

  const handleStart = useCallback(async () => {
    const gpsGranted = await permissions.requestGpsPermission();
    if (!gpsGranted) {
      Alert.alert(t('walk.permission.title'), t('walk.permission.message'));
      return;
    }

    try {
      const liveActivityDogName =
        selectedDogIds.length === 1
          ? t('walk.liveActivity.walking')
          : t('walk.liveActivity.walkingWithDogs', { count: selectedDogIds.length });
      const newWalkId = await walkSession.start({ selectedDogIds, liveActivityDogName });

      if (me?.encounterDetectionEnabled ?? true) {
        const bleGranted = await permissions.requestBlePermission();
        if (bleGranted) {
          encounterSession.start(newWalkId);
          await bleSession.start(newWalkId, (detected) =>
            encounterSession.onDeviceDetected(detected),
          );
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [selectedDogIds, walkSession, bleSession, encounterSession, permissions, me, t]);

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);
    bleSession.stop();
    encounterSession.stop();
    try {
      await walkSession.stop(walkId);
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, walkSession, bleSession, encounterSession, t]);

  if (phase === 'recording') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <WalkMap />
        <View style={[styles.topOverlay, { top: insets.top + spacing.xs }]}>
          <WalkTopChip dogs={selectedDogs} />
        </View>
        <View style={styles.bottomOverlay} pointerEvents="box-none">
          <WalkControls dogs={selectedDogs} onStop={handleStop} isStopping={isStopping}>
            <WalkEventActions dogs={selectedDogs} />
          </WalkControls>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      {phase === 'ready' && (
        <WalkReadyView onStart={handleStart} isStarting={walkSession.isStarting} />
      )}
      {phase === 'finished' && <WalkSummaryCard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
