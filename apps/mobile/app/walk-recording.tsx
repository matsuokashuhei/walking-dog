import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkTopChip } from '@/components/walk/WalkTopChip';
import { spacing } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

export default function WalkRecordingScreen() {
  const theme = useColors();
  const phase = useWalkStore((s) => s.phase);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();
  const insets = useSafeAreaInsets();

  const hasPushedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'recording') return;
    if (hasPushedRef.current) return;
    hasPushedRef.current = true;
    router.push({
      pathname: '/walk-recording-controls',
      params: params.action === 'camera' ? { action: 'camera' } : undefined,
    });
  }, [phase, params.action]);

  const selectedDogs = useMemo<Dog[]>(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WalkMap />
      <View style={[styles.topOverlay, { top: insets.top + spacing.xs }]}>
        <WalkTopChip dogs={selectedDogs} />
      </View>
    </View>
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
});
