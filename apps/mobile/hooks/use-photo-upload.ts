import { useCallback } from 'react';
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

interface UsePhotoUploadResult {
  uploadPhoto: (args: UploadPhotoArgs) => Promise<WalkEvent>;
  isPending: boolean;
}

// 署名付き URL の発行、画像アップロード、写真イベント記録を順に実行します。
export function usePhotoUpload(): UsePhotoUploadResult {
  const uploadPhoto = useCallback(
    async (args: UploadPhotoArgs): Promise<WalkEvent> => {
      throw new PhotoUploadError(
        'presign',
        new Error(
          `Photo upload is not supported by the current GraphQL schema for walk ${args.walkId}.`,
        ),
      );
    },
    [],
  );

  return {
    uploadPhoto,
    isPending: false,
  };
}
