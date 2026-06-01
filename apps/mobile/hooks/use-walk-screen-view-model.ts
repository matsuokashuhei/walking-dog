import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWalkPermissions } from '@/hooks/use-walk-permissions';
import { useWalkSession } from '@/hooks/use-walk-session';
import { useWalkStore } from '@/stores/walk-store';

// Walk 画面へ渡す表示状態と操作をまとめた ViewModel の型です。
export interface WalkScreenViewModel {
  phase: 'ready' | 'recording' | 'finished';
  isStarting: boolean;
  handleStart: () => Promise<void>;
}

// Walk 画面で必要な状態取得、画面遷移、散歩開始処理をまとめるフックです。
export function useWalkScreenViewModel(): WalkScreenViewModel {
  const { t } = useTranslation();
  const phase = useWalkStore((state) => state.phase) as WalkScreenViewModel['phase'];
  const selectedDogIds = useWalkStore((state) => state.selectedDogIds);

  const walkSession = useWalkSession();
  const permissions = useWalkPermissions();

  // 散歩開始時は GPS 権限を確認してから散歩セッションを開始します。
  const handleStart = useCallback(async () => {
    const gpsGranted = await permissions.requestGpsPermission();
    if (!gpsGranted) {
      Alert.alert(t('walk.permission.title'), t('walk.permission.message'));
      return;
    }

    try {
      await walkSession.start({ selectedDogIds });
    } catch (error) {
      console.error('[walk.start] failed', error);
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [permissions, selectedDogIds, t, walkSession]);

  // 画面側が表示分岐と開始ボタン制御に使う値だけを返します。
  return {
    phase,
    isStarting: walkSession.isStarting,
    handleStart,
  };
}
