import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWalkSession } from '@/hooks/use-walk-session';
import { useWalkStore } from '@/stores/walk-store';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkEventActions } from '@/components/walk/WalkEventActions';
import type { Dog } from '@/types/graphql';

interface WalkRecordingSheetContentProps {
  dogs: Dog[];
}

// 記録中シートの中身。外枠は開始前と同じ WalkFloatingSheet を使い続けます。
export function WalkRecordingSheetContent({ dogs }: WalkRecordingSheetContentProps) {
  const { t } = useTranslation();
  const walkId = useWalkStore((s) => s.walkId);
  const walkSession = useWalkSession();
  const [isStopping, setIsStopping] = useState(false);

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);
    try {
      await walkSession.stop(walkId);
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, walkSession, t]);

  return (
    <WalkControls dogs={dogs} onStop={handleStop} isStopping={isStopping}>
      <WalkEventActions dogs={dogs} />
    </WalkControls>
  );
}
