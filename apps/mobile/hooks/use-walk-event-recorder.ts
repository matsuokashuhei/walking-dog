import { useCallback } from 'react';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { usePhotoUpload, PhotoUploadError } from '@/hooks/use-photo-upload';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import type { WalkEvent, WalkEventType } from '@/types/graphql';

interface UseWalkEventRecorderArgs {
  walkId: string | null;
  latestPoint?: { lat: number; lng: number };
  source?: string;
}

interface RecordPhotoArgs {
  dogId?: string;
  asset: { uri: string; mimeType?: string | null };
}

export function useWalkEventRecorder({
  walkId,
  latestPoint,
  source = 'WalkEventActions',
}: UseWalkEventRecorderArgs) {
  const recordWalkEvent = useRecordWalkEvent();
  const photoUpload = usePhotoUpload();
  const runWithAlert = useMutationWithAlert();

  const recordEvent = useCallback(
    async (eventType: Extract<WalkEventType, 'pee' | 'poo'>, dogId?: string) => {
      if (!walkId) return null;

      return runWithAlert<WalkEvent>(
        () =>
          recordWalkEvent.mutateAsync({
            walkId,
            dogId,
            eventType,
            occurredAt: new Date().toISOString(),
            ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
          }),
        'walk.event.recordError',
        { action: 'recordWalkEvent', dogId, eventType, source },
      );
    },
    [walkId, latestPoint, recordWalkEvent, runWithAlert, source],
  );

  const recordPhoto = useCallback(
    async ({ dogId, asset }: RecordPhotoArgs) => {
      if (!walkId) return null;

      return runWithAlert<WalkEvent>(
        () =>
          photoUpload.uploadPhoto({
            walkId,
            dogId,
            asset,
            ...(latestPoint ? { latestPoint } : {}),
          }),
        (error) => {
          const phase = error instanceof PhotoUploadError ? error.phase : 'record';
          return {
            presign: 'walk.event.photoPresignError' as const,
            upload: 'walk.event.photoUploadError' as const,
            record: 'walk.event.recordError' as const,
          }[phase];
        },
        { action: 'uploadWalkPhoto', dogId, source },
      );
    },
    [walkId, latestPoint, photoUpload, runWithAlert, source],
  );

  return {
    recordEvent,
    recordPhoto,
    isPending: recordWalkEvent.isPending || photoUpload.isPending,
  };
}
