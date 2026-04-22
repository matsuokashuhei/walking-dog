import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBleSession } from '@/hooks/use-ble-session';
import { useEncounterSession } from '@/hooks/use-encounter-session';
import { useMe } from '@/hooks/use-me';
import { useWalkPermissions } from '@/hooks/use-walk-permissions';
import { useWalkSession } from '@/hooks/use-walk-session';
import { useWalkStore } from '@/stores/walk-store';

export interface WalkScreenViewModel {
  phase: 'ready' | 'recording' | 'finished';
  isStarting: boolean;
  handleStart: () => Promise<void>;
}

export function useWalkScreenViewModel(): WalkScreenViewModel {
  const { t } = useTranslation();
  const router = useRouter();
  const phase = useWalkStore((state) => state.phase) as WalkScreenViewModel['phase'];
  const selectedDogIds = useWalkStore((state) => state.selectedDogIds);
  const { action } = useLocalSearchParams<{ action?: string }>();

  const { data: me } = useMe();
  const walkSession = useWalkSession();
  const bleSession = useBleSession();
  const encounterSession = useEncounterSession();
  const permissions = useWalkPermissions();

  useEffect(() => {
    if (phase !== 'recording') return;
    router.push({
      pathname: '/walk-recording',
      params: action === 'camera' ? { action: 'camera' } : undefined,
    });
  }, [action, phase]);

  const handleStart = useCallback(async () => {
    const gpsGranted = await permissions.requestGpsPermission();
    if (!gpsGranted) {
      Alert.alert(t('walk.permission.title'), t('walk.permission.message'));
      return;
    }

    try {
      const liveActivityDogName =
        selectedDogIds.length === 1
          ? t('walk.liveActivity.walking')
          : t('walk.liveActivity.walkingWithDogs', { count: selectedDogIds.length });
      const walkId = await walkSession.start({ selectedDogIds, liveActivityDogName });

      if (me?.encounterDetectionEnabled ?? true) {
        const bleGranted = await permissions.requestBlePermission();
        if (bleGranted) {
          encounterSession.start(walkId);
          await bleSession.start(walkId, encounterSession.onDeviceDetected);
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [bleSession, encounterSession, me, permissions, selectedDogIds, t, walkSession]);

  return {
    phase,
    isStarting: walkSession.isStarting,
    handleStart,
  };
}
