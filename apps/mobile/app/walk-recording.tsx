import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { useWalk } from '@/hooks/use-walks';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkMapShell } from '@/components/walk/WalkMapShell';
import { WalkTopChip } from '@/components/walk/WalkTopChip';
import type { Dog } from '@/types/graphql';

// サーバが track_point から再計算した distance をポーリングする間隔。
const WALK_DISTANCE_POLL_INTERVAL_MS = 10_000;

// 記録中画面は全画面マップを表示し、操作パネル route を重ねて開きます。
export default function WalkRecordingScreen() {
  const theme = useColors();
  const phase = useWalkStore((s) => s.phase);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const walkId = useWalkStore((s) => s.walkId);
  const setTotalDistanceM = useWalkStore((s) => s.setTotalDistanceM);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();

  // サーバ側 (track_point → Haversine 累積) で計算した distance を定期取得し、
  // ストアの totalDistanceM へ反映します。
  const isRecording = phase === 'recording';
  const { data: walkSnapshot } = useWalk(walkId ?? '', {
    refetchIntervalMs: isRecording ? WALK_DISTANCE_POLL_INTERVAL_MS : undefined,
  });

  useEffect(() => {
    const distance = walkSnapshot?.distance;
    if (typeof distance !== 'number') return;
    setTotalDistanceM(distance);
  }, [walkSnapshot?.distance, setTotalDistanceM]);

  const hasPushedRef = useRef(false);
  useEffect(() => {
    // 記録フェーズに入った最初の 1 回だけ form sheet の操作パネルを表示します。
    if (phase !== 'recording') return;
    if (hasPushedRef.current) return;
    hasPushedRef.current = true;
    router.push({
      pathname: '/walk-recording-controls',
      params: params.action === 'camera' ? { action: 'camera' } : undefined,
    });
  }, [phase, params.action]);

  // 選択済み犬 ID から表示用の犬情報を引き直し、上部チップの単一情報源にします。
  const selectedDogs = useMemo<Dog[]>(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WalkMapShell map={<WalkMap mode="recording" />} top={<WalkTopChip dogs={selectedDogs} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
