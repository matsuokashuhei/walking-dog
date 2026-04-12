import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { useStartWalk, useFinishWalk, useAddWalkPoints } from '@/hooks/use-walk-mutations';
import { useRecordEncounter, useUpdateEncounterDuration } from '@/hooks/use-encounter-mutations';
import { requestPermission, startTracking } from '@/lib/walk/gps-tracker';
import { requestBluetoothPermission } from '@/lib/ble/permissions';
import { startScanning, startAdvertising, type BleScanner } from '@/lib/ble/scanner';
import { EncounterTracker } from '@/lib/ble/encounter-tracker';
import { WalkReadyView } from '@/components/walk/WalkReadyView';
import { DogSelectorSheet } from '@/components/walk/DogSelectorSheet';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkEventActions } from '@/components/walk/WalkEventActions';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';
import type { WalkPoint } from '@/types/graphql';

const MAX_POINTS_PER_BATCH = 200;

export default function WalkScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const addPoint = useWalkStore((s) => s.addPoint);
  const startRecording = useWalkStore((s) => s.startRecording);
  const finish = useWalkStore((s) => s.finish);

  const { data: me } = useMe();
  const startWalk = useStartWalk();
  const finishWalk = useFinishWalk();
  const addWalkPoints = useAddWalkPoints();
  const recordEncounter = useRecordEncounter();
  const updateEncounterDuration = useUpdateEncounterDuration();
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const bleScannerRef = useRef<BleScanner | null>(null);
  const bleAdvertiserRef = useRef<{ stop: () => void } | null>(null);
  const encounterTrackerRef = useRef<EncounterTracker | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (phase !== 'ready') {
      setIsSheetOpen(false);
    }
  }, [phase]);

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

      // Start BLE encounter detection if enabled
      const bleEnabled = me?.encounterDetectionEnabled ?? true;
      if (bleEnabled) {
        const bleGranted = await requestBluetoothPermission();
        if (bleGranted) {
          const currentWalkId = walk.id;
          const tracker = new EncounterTracker({
            onEncounterDetected: (theirWalkId) => {
              recordEncounter.mutate({ myWalkId: currentWalkId, theirWalkId });
            },
            onEncounterFinalized: (theirWalkId, durationMs) => {
              updateEncounterDuration.mutate({
                myWalkId: currentWalkId,
                theirWalkId,
                durationSec: Math.round(durationMs / 1000),
              });
            },
          });
          tracker.start();
          encounterTrackerRef.current = tracker;

          const scanner = await startScanning((detectedWalkId) => {
            tracker.onDeviceDetected(detectedWalkId);
          });
          bleScannerRef.current = scanner;

          const advertiser = await startAdvertising(currentWalkId);
          bleAdvertiserRef.current = advertiser;
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [selectedDogIds, startWalk, startRecording, addPoint, me, recordEncounter, updateEncounterDuration, t]);

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);

    stopTrackingRef.current?.();
    stopTrackingRef.current = null;

    // Stop BLE
    bleScannerRef.current?.stop();
    bleScannerRef.current = null;
    bleAdvertiserRef.current?.stop();
    bleAdvertiserRef.current = null;
    encounterTrackerRef.current?.stop();
    encounterTrackerRef.current = null;

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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      {phase === 'ready' && (
        <>
          <WalkReadyView onStartPress={() => setIsSheetOpen(true)} />
          <DogSelectorSheet
            visible={isSheetOpen}
            onClose={() => setIsSheetOpen(false)}
            onStart={handleStart}
            isStarting={startWalk.isPending}
          />
        </>
      )}
      {phase === 'recording' && (
        <>
          <WalkMap />
          <WalkEventActions />
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
