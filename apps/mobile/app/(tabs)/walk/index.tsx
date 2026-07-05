import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useActiveWalkSnapshotSync } from '@/hooks/use-active-walk-snapshot-sync';
import { useRecordingWalkDogs } from '@/hooks/use-recording-walk-dogs';
import { useWalkLiveActivitySync } from '@/hooks/use-walk-live-activity-sync';
import { useWalkReadySelection } from '@/hooks/use-walk-ready-selection';
import { useWalkScreenViewModel } from '@/hooks/use-walk-screen-view-model';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { WalkFloatingSheet } from '@/components/walk/WalkFloatingSheet';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkMapShell } from '@/components/walk/WalkMapShell';
import { WalkReadySheetContent } from '@/components/walk/WalkReadySheetContent';
import { WalkRecordingControlsOverlay } from '@/components/walk/WalkRecordingControlsOverlay';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';
import { WalkTopChip } from '@/components/walk/WalkTopChip';
import { useWalkStore } from '@/stores/walk-store';

// 散歩タブは現在の散歩フェーズに応じて、開始前または終了後サマリーを表示します。
export default function WalkScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useWalkScreenViewModel();
  const params = useLocalSearchParams<{ action?: string; walkId?: string }>();
  const routeWalkId = typeof params.walkId === 'string' ? params.walkId : undefined;
  const readySelection = useWalkReadySelection({ enabled: vm.phase === 'ready' });
  const recordingDogs = useRecordingWalkDogs();
  const walkId = useWalkStore((s) => s.walkId);
  const requestCamera = useWalkStore((s) => s.requestCamera);

  useActiveWalkSnapshotSync(routeWalkId);
  useWalkLiveActivitySync(recordingDogs);

  useEffect(() => {
    if (params.action !== 'camera') return;
    if (vm.phase !== 'recording' || !walkId) return;

    requestCamera();
    router.setParams({ action: undefined });
  }, [params.action, requestCamera, vm.phase, walkId]);

  if (vm.phase === 'ready' || vm.phase === 'recording') {
    const isRecording = vm.phase === 'recording';
    const chipDogs = isRecording ? recordingDogs : readySelection.selectedDogs;

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <WalkMapShell
          map={
            <WalkMap
              mode={isRecording ? 'recording' : 'preview'}
              dogs={isRecording ? recordingDogs : []}
            />
          }
          top={
            <WalkTopChip
              dogs={chipDogs}
              label={isRecording ? undefined : t('walk.ready.topLabelStatic')}
            />
          }
          bottom={
            isRecording ? (
              <WalkRecordingControlsOverlay dogs={recordingDogs} />
            ) : (
              <WalkFloatingSheet>
                <WalkReadySheetContent
                  selection={readySelection}
                  onStart={vm.handleStart}
                  isStarting={vm.isStarting}
                />
              </WalkFloatingSheet>
            )
          }
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('tabs.walk')} />
      {vm.phase === 'finished' && <WalkSummaryCard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
