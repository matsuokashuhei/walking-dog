import { useCallback, useRef } from 'react';
import { EncounterTracker } from '@/lib/ble/encounter-tracker';
import {
  useRecordEncounter,
  useUpdateEncounterDuration,
} from './use-encounter-mutations';

export function useEncounterSession() {
  const recordEncounter = useRecordEncounter();
  const updateEncounterDuration = useUpdateEncounterDuration();
  const trackerRef = useRef<EncounterTracker | null>(null);

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

  const onDeviceDetected = useCallback((theirWalkId: string) => {
    trackerRef.current?.onDeviceDetected(theirWalkId);
  }, []);

  const stop = useCallback(() => {
    trackerRef.current?.stop();
    trackerRef.current = null;
  }, []);

  return { start, stop, onDeviceDetected };
}
