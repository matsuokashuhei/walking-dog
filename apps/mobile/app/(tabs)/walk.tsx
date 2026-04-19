import { useCallback, useEffect } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';

export default function WalkScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const phase = useWalkStore((s) => s.phase);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();
  const walkSession = useWalkSession();
  const bleSession = useBleSession();
  const encounterSession = useEncounterSession();
  const permissions = useWalkPermissions();

  // Recording runs on its own full-screen route (outside the tab group) so the
  // native tab bar disappears while the map is live. Redirect here whenever
  // the walk store enters the recording phase.
  useEffect(() => {
    if (phase !== 'recording') return;
    router.push({
      pathname: '/walk-recording',
      params: params.action === 'camera' ? { action: 'camera' } : undefined,
    });
  }, [phase, params.action]);

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
});
