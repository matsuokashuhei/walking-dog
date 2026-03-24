import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useWalkStore } from '@/stores/walk-store';
import { useStartWalk, useFinishWalk, useAddWalkPoints } from '@/hooks/use-walk-mutations';
import { requestPermission, startTracking } from '@/lib/walk/gps-tracker';
import { DogSelector } from '@/components/walk/DogSelector';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';
import type { WalkPoint } from '@/types/graphql';

const MAX_POINTS_PER_BATCH = 200;

export default function WalkScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const addPoint = useWalkStore((s) => s.addPoint);
  const startRecording = useWalkStore((s) => s.startRecording);
  const finish = useWalkStore((s) => s.finish);

  const startWalk = useStartWalk();
  const finishWalk = useFinishWalk();
  const addWalkPoints = useAddWalkPoints();
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const handleStart = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(t('walk.permission.title'), t('walk.permission.message'));
      return;
    }

    try {
      const walk = await startWalk.mutateAsync(selectedDogIds);
      startRecording(walk.id);
      const stop = await startTracking((point: WalkPoint) => {
        addPoint(point);
      });
      stopTrackingRef.current = stop;
    } catch {
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [selectedDogIds, startWalk, startRecording, addPoint, t]);

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);

    stopTrackingRef.current?.();
    stopTrackingRef.current = null;

    try {
      const currentPoints = useWalkStore.getState().points;
      for (let i = 0; i < currentPoints.length; i += MAX_POINTS_PER_BATCH) {
        const batch = currentPoints.slice(i, i + MAX_POINTS_PER_BATCH).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          recordedAt: p.recordedAt,
        }));
        await addWalkPoints.mutateAsync({ walkId, points: batch });
      }

      const totalDistanceM = useWalkStore.getState().totalDistanceM;
      await finishWalk.mutateAsync({
        walkId,
        distanceM: Math.round(totalDistanceM),
      });
      finish();
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, addWalkPoints, finishWalk, finish, t]);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {phase === 'ready' && (
        <DogSelector onStart={handleStart} isStarting={startWalk.isPending} />
      )}
      {phase === 'recording' && (
        <>
          <WalkMap />
          <WalkControls onStop={handleStop} isStopping={isStopping} />
        </>
      )}
      {phase === 'finished' && <WalkSummaryCard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
