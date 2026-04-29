import { useCallback } from 'react';
import {
  useGenerateWalkEventPhotoUploadUrl,
  useRecordWalkEvent,
} from '@/hooks/use-walk-event-mutations';
import { normalizeImageContentType, uploadToPresignedUrl } from '@/lib/upload';
import type { WalkEvent } from '@/types/graphql';

// 写真アップロード処理のどの段階で失敗したかを表します。
export type PhotoUploadPhase = 'presign' | 'upload' | 'record';

// アラート文言を切り替えるため、失敗した段階を保持するエラーです。
export class PhotoUploadError extends Error {
  readonly phase: PhotoUploadPhase;
  override readonly cause: unknown;

  constructor(phase: PhotoUploadPhase, cause: unknown) {
    super(`photo upload failed at ${phase}`);
    this.name = 'PhotoUploadError';
    this.phase = phase;
    this.cause = cause;
  }
}

interface UploadPhotoArgs {
  walkId: string;
  dogId?: string;
  asset: { uri: string; mimeType?: string | null };
  latestPoint?: { lat: number; lng: number };
}

// 署名付き URL の発行、画像アップロード、写真イベント記録を順に実行します。
export function usePhotoUpload() {
  const generatePhotoUploadUrl = useGenerateWalkEventPhotoUploadUrl();
  const recordWalkEvent = useRecordWalkEvent();

  const uploadPhoto = useCallback(
    async (args: UploadPhotoArgs): Promise<WalkEvent> => {
      let phase: PhotoUploadPhase = 'presign';
      try {
        // 各段階の直前に phase を更新し、失敗箇所を呼び出し元へ伝えます。
        const contentType = normalizeImageContentType(args.asset.mimeType);
        const { url, key } = await generatePhotoUploadUrl.mutateAsync({
          walkId: args.walkId,
          contentType,
        });

        phase = 'upload';
        await uploadToPresignedUrl(url, args.asset.uri, contentType);

        phase = 'record';
        const event = await recordWalkEvent.mutateAsync({
          walkId: args.walkId,
          dogId: args.dogId,
          eventType: 'photo',
          occurredAt: new Date().toISOString(),
          ...(args.latestPoint ?? {}),
          photoKey: key,
        });

        return event;
      } catch (cause) {
        // 元の例外は cause に残し、UI では phase ごとの文言に変換できるようにします。
        throw new PhotoUploadError(phase, cause);
      }
    },
    [generatePhotoUploadUrl, recordWalkEvent],
  );

  return {
    uploadPhoto,
    isPending: generatePhotoUploadUrl.isPending || recordWalkEvent.isPending,
  };
}
