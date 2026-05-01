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
import { spacing } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

// 記録操作パネルは form sheet として表示され、イベント記録と停止操作を担当します。
export default function WalkRecordingControlsScreen() {
  const { t } = useTranslation();
  const walkId = useWalkStore((s) => s.walkId);
  const phase = useWalkStore((s) => s.phase);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const requestCamera = useWalkStore((s) => s.requestCamera);
  const params = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();
  const walkSession = useWalkSession();
  const bleSession = useBleSession();
  const encounterSession = useEncounterSession();
  const navigation = useNavigation();
  const [isStopping, setIsStopping] = useState(false);
  const lastDetentRef = useRef(0);

  // 操作対象の犬は store の選択 ID と me.dogs を突き合わせて復元します。
  const selectedDogs = useMemo<Dog[]>(
    () => (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id)),
    [me?.dogs, selectedDogIds],
  );

  useEffect(() => {
    // クイック操作からカメラ指定で開かれた場合だけ、準備完了後に撮影要求へ変換します。
    if (params.action !== 'camera') return;
    if (phase === 'recording' && walkId) {
      requestCamera();
      router.setParams({ action: undefined });
    }
  }, [params.action, phase, walkId, requestCamera]);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { height: screenH } = Dimensions.get('window');
      // 実測した操作パネルの高さに grabber と inset 分を足し、sheet の detent を更新します。
      const sheetHeight = e.nativeEvent.layout.height + 28;
      const fraction = Math.min(0.9, Math.max(0.25, sheetHeight / screenH));
      if (Math.abs(fraction - lastDetentRef.current) < 0.01) return;
      lastDetentRef.current = fraction;
      navigation.setOptions({
        sheetAllowedDetents: [0.15, fraction],
      });
    },
    [navigation],
  );

  // 停止時は BLE と遭遇検知を先に止めてから散歩セッションを終了し、サマリーへ戻します。
  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);
    bleSession.stop();
    encounterSession.stop();
    try {
      await walkSession.stop(walkId);
      router.dismissTo('/(tabs)/walk');
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, walkSession, bleSession, encounterSession, t]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <WalkControls dogs={selectedDogs} onStop={handleStop} isStopping={isStopping}>
        <WalkEventActions dogs={selectedDogs} />
      </WalkControls>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
