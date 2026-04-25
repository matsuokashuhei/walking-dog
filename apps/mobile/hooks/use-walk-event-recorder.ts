import { useCallback, useEffect } from 'react';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { usePhotoUpload, PhotoUploadError } from '@/hooks/use-photo-upload';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import { useFlushWalkEventOutbox } from '@/hooks/use-flush-walk-event-outbox';
import { enqueuePendingEvent } from '@/lib/walk/event-outbox';
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
  const flushOutbox = useFlushWalkEventOutbox();

  // Drain any events queued during a previous offline session as soon as
  // the recorder mounts (typically when the user reopens the recording sheet
  // after coming back online).
  useEffect(() => {
    void flushOutbox().catch(() => {
      /* swallow — best-effort, will retry on next successful record */
    });
  }, [flushOutbox]);

  const recordEvent = useCallback(
    async (eventType: Extract<WalkEventType, 'pee' | 'poo'>, dogId?: string) => {
      if (!walkId) return null;

      const occurredAt = new Date().toISOString();
      const result = await runWithAlert<WalkEvent>(
        () =>
          recordWalkEvent.mutateAsync({
            walkId,
            dogId,
            eventType,
            occurredAt,
            ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
          }),
        'walk.event.recordError',
        { action: 'recordWalkEvent', dogId, eventType, source },
      );

      if (!result) {
        // Mutation failed — persist for retry. Photo events stay online-only.
        await enqueuePendingEvent({
          walkId,
          ...(dogId !== undefined ? { dogId } : {}),
          eventType,
          occurredAt,
          ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
        }).catch(() => {
          /* swallow — alert already shown to the user */
        });
        return null;
      }

      // Success — opportunistically drain any backlog from earlier failures.
      void flushOutbox().catch(() => {
        /* swallow */
      });
      return result;
    },
    [walkId, latestPoint, recordWalkEvent, runWithAlert, source, flushOutbox],
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
