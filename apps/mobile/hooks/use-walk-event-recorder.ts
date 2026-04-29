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

// 散歩イベントの即時記録、写真アップロード、オフライン時の outbox 保存をまとめます。
export function useWalkEventRecorder({
  walkId,
  latestPoint,
  source = 'WalkEventActions',
}: UseWalkEventRecorderArgs) {
  const recordWalkEvent = useRecordWalkEvent();
  const photoUpload = usePhotoUpload();
  const runWithAlert = useMutationWithAlert();
  const flushOutbox = useFlushWalkEventOutbox();

  // レコーダー起動時に、過去のオフライン操作で溜まったイベントを再送します。
  useEffect(() => {
    void flushOutbox().catch(() => {
      /* ベストエフォートのため、次回の記録成功時に再試行します。 */
    });
  }, [flushOutbox]);

  // 通常イベントは失敗時に outbox へ積み、オンライン復帰後に再送できるようにします。
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
        // 失敗した通常イベントだけを再送対象として保存します。写真イベントはオンライン専用です。
        await enqueuePendingEvent({
          walkId,
          ...(dogId !== undefined ? { dogId } : {}),
          eventType,
          occurredAt,
          ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
        }).catch(() => {
          /* アラート表示済みのため、保存失敗はここでは握りつぶします。 */
        });
        return null;
      }

      // 成功時に、以前の失敗で残っているイベントも可能な範囲で再送します。
      void flushOutbox().catch(() => {
        /* ベストエフォートのため握りつぶします。 */
      });
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
