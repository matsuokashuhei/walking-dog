import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { useWalk } from '@/hooks/use-walks';
import { useWalkLiveActivitySync } from '@/hooks/use-walk-live-activity-sync';
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
  const storedDogs = useWalkStore((s) => s.dogs);
  const walkId = useWalkStore((s) => s.walkId);
  const setTotalDistanceM = useWalkStore((s) => s.setTotalDistanceM);
  const hydrateRecordingSession = useWalkStore((s) => s.hydrateRecordingSession);
  const params = useLocalSearchParams<{ action?: string; walkId?: string }>();

  const { data: me } = useMe();

  // サーバ側 (track_point → Haversine 累積) で計算した distance を定期取得し、
  // ストアの totalDistanceM へ反映します。
  const isRecording = phase === 'recording';
  const routeWalkId = typeof params.walkId === 'string' ? params.walkId : undefined;
  const effectiveWalkId = walkId ?? routeWalkId ?? '';
  const { data: walkSnapshot } = useWalk(effectiveWalkId, {
    refetchIntervalMs: isRecording ? WALK_DISTANCE_POLL_INTERVAL_MS : undefined,
  });

  useEffect(() => {
    const distance = walkSnapshot?.distanceM ?? walkSnapshot?.distance;
    if (typeof distance !== 'number') return;
    setTotalDistanceM(distance);
  }, [walkSnapshot?.distance, walkSnapshot?.distanceM, setTotalDistanceM]);

  useEffect(() => {
    if (!routeWalkId || !walkSnapshot || walkSnapshot.status !== 'ACTIVE') return;
    if (phase === 'recording' && walkId === walkSnapshot.id) return;

    hydrateRecordingSession({
      walkId: walkSnapshot.id,
      startedAt: walkSnapshot.startedAt,
      selectedDogIds: walkSnapshot.dogs.map((dog) => dog.id),
      dogs: walkSnapshot.dogs,
      points: walkSnapshot.points ?? [],
      flushedPointCount: walkSnapshot.points?.length ?? 0,
      totalDistanceM: walkSnapshot.distanceM ?? walkSnapshot.distance ?? 0,
      events: walkSnapshot.events ?? [],
    });
  }, [hydrateRecordingSession, phase, routeWalkId, walkId, walkSnapshot]);

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
    () => {
      const dogs = (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id));
      return dogs.length > 0 ? dogs : storedDogs;
    },
    [me?.dogs, selectedDogIds, storedDogs],
  );
  useWalkLiveActivitySync(selectedDogs);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WalkMapShell map={<WalkMap mode="recording" />} top={<WalkTopChip dogs={selectedDogs} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
