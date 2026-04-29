import { useCallback, useRef } from 'react';
import { EncounterTracker } from '@/lib/ble/encounter-tracker';
import {
  useRecordEncounter,
  useUpdateEncounterDuration,
} from './use-encounter-mutations';

// BLE で検知した相手の散歩 ID を、遭遇開始・終了イベントへ変換します。
export function useEncounterSession() {
  const recordEncounter = useRecordEncounter();
  const updateEncounterDuration = useUpdateEncounterDuration();
  const trackerRef = useRef<EncounterTracker | null>(null);

  // EncounterTracker のコールバックで、遭遇記録と滞在時間更新をサーバーへ送ります。
  const start = useCallback(
    (walkId: string) => {
      const tracker = new EncounterTracker({
        onEncounterDetected: (theirWalkId) => {
          recordEncounter.mutate({ myWalkId: walkId, theirWalkId });
        },
        onEncounterFinalized: (theirWalkId, durationMs) => {
          updateEncounterDuration.mutate({
            myWalkId: walkId,
            theirWalkId,
            durationSec: Math.round(durationMs / 1000),
          });
        },
      });
      tracker.start();
      trackerRef.current = tracker;
    },
    [recordEncounter, updateEncounterDuration],
  );

  // BLE スキャナーからの検知通知を、現在の tracker インスタンスへ渡します。
  const onDeviceDetected = useCallback((theirWalkId: string) => {
    trackerRef.current?.onDeviceDetected(theirWalkId);
  }, []);

  // 散歩終了時に tracker を停止し、重複検知が残らないようにします。
  const stop = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
  }, []);

  return { start, stop, onDeviceDetected };
}
