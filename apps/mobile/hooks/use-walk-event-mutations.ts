import { useMutation } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  RECORD_WALK_EVENT_MUTATION,
  GENERATE_WALK_EVENT_PHOTO_UPLOAD_URL_MUTATION,
} from '@/lib/graphql/mutations';
import type {
  RecordWalkEventInput,
  WalkEvent,
  PresignedUrl,
  RecordWalkEventResponse,
  GenerateWalkEventPhotoUploadUrlResponse,
} from '@/types/graphql';

export function useRecordWalkEvent() {
  return useMutation<WalkEvent, Error, RecordWalkEventInput>({
    mutationFn: async (input) => {
      const data = await authenticatedRequest<RecordWalkEventResponse>(
        RECORD_WALK_EVENT_MUTATION,
        { input },
      );
      return data.recordWalkEvent;
    },
  });
}

export function useGenerateWalkEventPhotoUploadUrl() {
  return useMutation<PresignedUrl, Error, { walkId: string; contentType: string }>({
    mutationFn: async ({ walkId, contentType }) => {
      const data = await authenticatedRequest<GenerateWalkEventPhotoUploadUrlResponse>(
        GENERATE_WALK_EVENT_PHOTO_UPLOAD_URL_MUTATION,
        { walkId, contentType },
      );
      return data.generateWalkEventPhotoUploadUrl;
    },
  });
}
