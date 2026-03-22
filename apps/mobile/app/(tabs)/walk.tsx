import { useCallback, useEffect, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { useStartWalk, useFinishWalk } from '@/hooks/use-walk-mutations';
import { useWalkStore } from '@/stores/walk-store';
import { DogSelector } from '@/components/walk/DogSelector';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkMap } from '@/components/walk/WalkMap';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import * as GpsTracker from '@/lib/walk/gps-tracker';
import * as PointBuffer from '@/lib/walk/point-buffer';
import * as SyncService from '@/lib/walk/sync-service';

export default function WalkScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: user, isLoading } = useMe();
  const startWalkMutation = useStartWalk();
  const finishWalkMutation = useFinishWalk();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const points = useWalkStore((s) => s.points);
  const distanceM = useWalkStore((s) => s.distanceM);
  const elapsedSec = useWalkStore((s) => s.elapsedSec);
  const setPhase = useWalkStore((s) => s.setPhase);
  const setWalkId = useWalkStore((s) => s.setWalkId);
  const setSelectedDogIds = useWalkStore((s) => s.setSelectedDogIds);
  const addPoint = useWalkStore((s) => s.addPoint);
  const setElapsed = useWalkStore((s) => s.setElapsed);
  const reset = useWalkStore((s) => s.reset);

  // Start elapsed timer when recording
  useEffect(() => {
    if (phase === 'recording') {
      const startTime = Date.now() - elapsedSec * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  const handleToggleDog = useCallback(
    (id: string) => {
      const current = useWalkStore.getState().selectedDogIds;
      if (current.includes(id)) {
        setSelectedDogIds(current.filter((d) => d !== id));
      } else {
        setSelectedDogIds([...current, id]);
      }
    },
    [setSelectedDogIds],
  );

  const handleStartWalk = useCallback(async () => {
    try {
      const walk = await startWalkMutation.mutateAsync(selectedDogIds);
      setWalkId(walk.id);
      setPhase('recording');

      await PointBuffer.init();
      await SyncService.startSync(walk.id);
      await GpsTracker.startTracking(async (point) => {
        addPoint(point);
        await PointBuffer.push(walk.id, point);
        await SyncService.onNewPoint();
      });
    } catch {
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [selectedDogIds, startWalkMutation, setWalkId, setPhase, addPoint, t]);

  const handleFinishWalk = useCallback(() => {
    Alert.alert(t('walk.finishWalk'), t('walk.finishConfirm'), [
      { text: t('common.error'), style: 'cancel' },
      {
        text: t('walk.finishWalk'),
        style: 'destructive',
        onPress: async () => {
          try {
            GpsTracker.stopTracking();
            await SyncService.stopSync();

            if (walkId) {
              await finishWalkMutation.mutateAsync(walkId);
            }
            setPhase('finished');
          } catch {
            Alert.alert(t('common.error'), t('walk.error.finishFailed'));
          }
        },
      },
    ]);
  }, [walkId, finishWalkMutation, setPhase, t]);

  const handleNewWalk = useCallback(() => {
    reset();
    setPhase('selecting');
  }, [reset, setPhase]);

  // Initialize to selecting phase
  useEffect(() => {
    if (phase === 'idle') {
      setPhase('selecting');
    }
  }, [phase, setPhase]);

  if (isLoading) return <LoadingScreen />;

  const dogs = user?.dogs ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {phase === 'selecting' && (
        <View style={styles.section}>
          <DogSelector
            dogs={dogs}
            selectedIds={selectedDogIds}
            onToggle={handleToggleDog}
          />
          <Button
            label={t('walk.startWalk')}
            onPress={handleStartWalk}
            loading={startWalkMutation.isPending}
            disabled={selectedDogIds.length === 0}
            style={styles.startButton}
            accessibilityLabel={t('walk.startWalk')}
          />
        </View>
      )}

      {phase === 'recording' && (
        <View style={styles.section}>
          <View style={styles.mapContainer}>
            <WalkMap points={points} isRecording />
          </View>
          <WalkControls
            elapsedSec={elapsedSec}
            distanceM={distanceM}
            onFinish={handleFinishWalk}
            loading={finishWalkMutation.isPending}
          />
        </View>
      )}

      {phase === 'finished' && (
        <View style={styles.section}>
          <View style={styles.mapContainer}>
            <WalkMap points={points} />
          </View>
          <WalkControls
            elapsedSec={elapsedSec}
            distanceM={distanceM}
            onFinish={() => {}}
          />
          <Button
            label={t('walk.startWalk')}
            onPress={handleNewWalk}
            style={styles.startButton}
            accessibilityLabel={t('walk.startWalk')}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  mapContainer: {
    height: 300,
  },
  startButton: {
    marginTop: spacing.sm,
  },
});
