import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { WalkFloatingBar } from '@/components/walk/WalkFloatingBar';
import { WalkMap } from '@/components/walk/WalkMap';
import { spacing } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

type LiveMapType = 'standard' | 'hybrid';

export default function WalkRecordingScreen() {
  const theme = useColors();
  const phase = useWalkStore((s) => s.phase);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const isMinimized = useWalkStore((s) => s.isMinimized);
  const setMinimized = useWalkStore((s) => s.setMinimized);
  const params = useLocalSearchParams<{ action?: string }>();
  const [mapType, setMapType] = useState<LiveMapType>('standard');

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

  const handleMinimize = useCallback(() => {
    setMinimized(true);
  }, [setMinimized]);

  const handleToggleMapType = useCallback(() => {
    setMapType((current) => (current === 'standard' ? 'hybrid' : 'standard'));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WalkMap mapType={mapType} />
      <View style={[styles.topOverlay, { top: insets.top + spacing.xs }]}>
        <WalkFloatingBar
          dogs={selectedDogs}
          isMinimized={isMinimized}
          isHybridMap={mapType === 'hybrid'}
          onMinimize={handleMinimize}
          onToggleMapType={handleToggleMapType}
        />
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
