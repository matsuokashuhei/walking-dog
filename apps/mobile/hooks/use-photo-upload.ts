import { useCallback } from 'react';
import {
  useGenerateWalkEventPhotoUploadUrl,
  useRecordWalkEvent,
} from '@/hooks/use-walk-event-mutations';
import { uploadToPresignedUrl } from '@/lib/upload';
import type { WalkEvent } from '@/types/graphql';

export type PhotoUploadPhase = 'presign' | 'upload' | 'record';

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

export function usePhotoUpload() {
  const generatePhotoUploadUrl = useGenerateWalkEventPhotoUploadUrl();
  const recordWalkEvent = useRecordWalkEvent();

  const uploadPhoto = useCallback(
    async (args: UploadPhotoArgs): Promise<WalkEvent> => {
      let phase: PhotoUploadPhase = 'presign';
      try {
        const contentType = args.asset.mimeType ?? 'image/jpeg';
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
          ...(args.latestPoint
            ? { lat: args.latestPoint.lat, lng: args.latestPoint.lng }
            : {}),
          photoKey: key,
        });

        return event;
      } catch (cause) {
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
