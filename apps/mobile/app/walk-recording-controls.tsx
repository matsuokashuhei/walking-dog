import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWalkStore } from '@/stores/walk-store';
import { useMe } from '@/hooks/use-me';
import { useWalkSession } from '@/hooks/use-walk-session';
import { useBleSession } from '@/hooks/use-ble-session';
import { useEncounterSession } from '@/hooks/use-encounter-session';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkEventActions } from '@/components/walk/WalkEventActions';
import { WalkMinimizedControls } from '@/components/walk/WalkMinimizedControls';
import { spacing } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

export default function WalkRecordingControlsScreen() {
  const { t } = useTranslation();
  const walkId = useWalkStore((s) => s.walkId);
  const phase = useWalkStore((s) => s.phase);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const isMinimized = useWalkStore((s) => s.isMinimized);
  const requestCamera = useWalkStore((s) => s.requestCamera);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();
  const walkSession = useWalkSession();
  const bleSession = useBleSession();
  const encounterSession = useEncounterSession();
  const navigation = useNavigation();
  const [isStopping, setIsStopping] = useState(false);
  const lastDetentRef = useRef('');

  const selectedDogs = useMemo<Dog[]>(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  useEffect(() => {
    if (params.action !== 'camera') return;
    if (phase === 'recording' && walkId) {
      requestCamera();
      router.setParams({ action: undefined });
    }
  }, [params.action, phase, walkId, requestCamera]);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height: screenH } = Dimensions.get('window');
      const sheetHeight = e.nativeEvent.layout.height + 28;
      const fraction = Math.min(0.9, Math.max(isMinimized ? 0.15 : 0.25, sheetHeight / screenH));
      const detents = isMinimized ? [0.15] : [0.15, fraction];
      const detentKey = detents.join(',');
      if (detentKey === lastDetentRef.current) return;
      lastDetentRef.current = detentKey;
      navigation.setOptions({
        sheetAllowedDetents: detents,
      });
    },
    [isMinimized, navigation],
  );

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);
    try {
      await walkSession.stop(walkId);
      bleSession.stop();
      encounterSession.stop();
      router.dismissTo('/(tabs)/walk');
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, walkSession, bleSession, encounterSession, t]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {isMinimized ? (
        <WalkMinimizedControls dogs={selectedDogs} />
      ) : (
        <WalkControls dogs={selectedDogs} onStop={handleStop} isStopping={isStopping}>
          <WalkEventActions dogs={selectedDogs} />
        </WalkControls>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
    paddingBottom: spacing.sm,
  },
});
