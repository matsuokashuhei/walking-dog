import { useCallback, useEffect } from 'react';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { usePhotoUpload, PhotoUploadError } from '@/hooks/use-photo-upload';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import { useFlushWalkEventOutbox } from '@/hooks/use-flush-walk-event-outbox';
import { runDetached } from '@/lib/run-detached';
import { enqueuePendingEvent } from '@/lib/walk/event-outbox';
import type { WalkActivityEventType, WalkEvent } from '@/types/graphql';

interface UseWalkEventRecorderArgs {
  walkId: string | null;
  latestPoint?: { lat: number; lng: number };
  source?: string;
}

interface RecordPhotoArgs {
  dogId?: string;
  asset: { uri: string; mimeType?: string | null };
}

interface UseWalkEventRecorderResult {
  recordEvent: (
    eventType: WalkActivityEventType,
    dogId?: string,
    options?: {
      latestPoint?: { lat: number; lng: number };
      occurredAt?: string;
      clientRequestId?: string;
    },
  ) => Promise<WalkEvent | null>;
  recordPhoto: (args: RecordPhotoArgs) => Promise<WalkEvent | null>;
  isPending: boolean;
}

function shouldQueueOfflineEvent(eventType: WalkActivityEventType): eventType is 'pee' | 'poo' {
  return eventType === 'pee' || eventType === 'poo';
}

function photoUploadErrorKey(error: unknown): string {
  const phase = error instanceof PhotoUploadError ? error.phase : 'record';

  switch (phase) {
    case 'presign':
      return 'walk.event.photoPresignError';
    case 'upload':
      return 'walk.event.photoUploadError';
    case 'record':
      return 'walk.event.recordError';
  }
}

// 散歩イベントの即時記録、写真アップロード、オフライン時の outbox 保存をまとめます。
export function useWalkEventRecorder({
  walkId,
  latestPoint,
  source = 'WalkEventActions',
}: UseWalkEventRecorderArgs): UseWalkEventRecorderResult {
  const recordWalkEvent = useRecordWalkEvent();
  const photoUpload = usePhotoUpload();
  const runWithAlert = useMutationWithAlert();
  const flushOutbox = useFlushWalkEventOutbox();

  // レコーダー起動時に、過去のオフライン操作で溜まったイベントを再送します。
  useEffect(() => {
    runDetached(flushOutbox(), 'walk.outbox.flushOnRecorderStart');
  }, [flushOutbox]);

  // 通常イベントは失敗時に outbox へ積み、オンライン復帰後に再送できるようにします。
  const recordEvent = useCallback(
    async (
      eventType: WalkActivityEventType,
      dogId?: string,
      options?: {
        latestPoint?: { lat: number; lng: number };
        occurredAt?: string;
        clientRequestId?: string;
      },
    ) => {
      if (!walkId) return null;

      const occurredAt = options?.occurredAt ?? new Date().toISOString();
      const eventPoint = options?.latestPoint ?? latestPoint;
      const result = await runWithAlert<WalkEvent>(
        () =>
          recordWalkEvent.mutateAsync({
            walkId,
            dogId,
            eventType,
            occurredAt,
            ...(eventPoint ? { lat: eventPoint.lat, lng: eventPoint.lng } : {}),
            ...(options?.clientRequestId ? { clientRequestId: options.clientRequestId } : {}),
          }),
        'walk.event.recordError',
        { action: 'recordWalkEvent', dogId, eventType, source },
      );

      if (!result) {
        // 失敗した通常イベントだけを再送対象として保存します。写真イベントはオンライン専用です。
        if (shouldQueueOfflineEvent(eventType)) {
          await enqueuePendingEvent({
            walkId,
            ...(dogId !== undefined ? { dogId } : {}),
            eventType,
            ...(options?.clientRequestId ? { clientRequestId: options.clientRequestId } : {}),
            occurredAt,
            ...(eventPoint ? { lat: eventPoint.lat, lng: eventPoint.lng } : {}),
          }).catch(() => {
            /* アラート表示済みのため、保存失敗はここでは握りつぶします。 */
          });
        }
        return null;
      }

      // 成功時に、以前の失敗で残っているイベントも可能な範囲で再送します。
      runDetached(flushOutbox(), 'walk.outbox.flushAfterRecord');
      return result;
    },
    [walkId, latestPoint, recordWalkEvent, runWithAlert, source, flushOutbox],
  );

  // 写真イベントは presign/upload/record のどこで失敗したかをアラート文言へ反映します。
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
        photoUploadErrorKey,
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
