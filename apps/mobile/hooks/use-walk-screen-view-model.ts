import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const router = useRouter();
  const phase = useWalkStore((state) => state.phase) as WalkScreenViewModel['phase'];
  const selectedDogIds = useWalkStore((state) => state.selectedDogIds);
  const { action } = useLocalSearchParams<{ action?: string }>();

  const walkSession = useWalkSession();
  const permissions = useWalkPermissions();

  // 散歩記録中になったら、必要なアクションを引き継いで記録画面へ移動します。
  useEffect(() => {
    if (phase !== 'recording') return;
    router.push({
      pathname: '/walk-recording',
      params: action === 'camera' ? { action: 'camera' } : undefined,
    });
  }, [action, phase, router]);

  // 散歩開始時は GPS 権限を確認し、散歩セッションと必要に応じて遭遇検知を開始します。
  const handleStart = useCallback(async () => {
    const gpsGranted = await permissions.requestGpsPermission();
    if (!gpsGranted) {
      Alert.alert(t('walk.permission.title'), t('walk.permission.message'));
      return;
    }

    try {
      // Live Activity に表示する文言は、選択中の犬の数に合わせて切り替えます。
      const liveActivityDogName =
        selectedDogIds.length === 1
          ? t('walk.liveActivity.walking')
          : t('walk.liveActivity.walkingWithDogs', { count: selectedDogIds.length });
      await walkSession.start({ selectedDogIds, liveActivityDogName });
    } catch {
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
