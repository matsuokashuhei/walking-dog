import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { RECORD_WALK_EVENT_MUTATION } from '@/lib/graphql/mutations/walk';
import { mapApiWalkDogEvent, uiEventToApiType } from '@/lib/graphql/adapters';
import type {
  RecordWalkEventInput,
  WalkEvent,
  RecordWalkEventResponse,
} from '@/types/graphql';

// 散歩中のイベントをサーバーへ記録します。
export function useRecordWalkEvent(): UseMutationResult<WalkEvent, Error, RecordWalkEventInput> {
  return useMutation<WalkEvent, Error, RecordWalkEventInput>({
    mutationFn: async (input) => {
      if (!input.dogId) {
        throw new Error('dogId is required to record a walk event.');
      }
      if (input.lat == null || input.lng == null) {
        throw new Error('latitude and longitude are required to record a walk event.');
      }
      const data = await authenticatedRequest<RecordWalkEventResponse>(
        RECORD_WALK_EVENT_MUTATION,
        {
          input: {
            walkId: input.walkId,
            dogId: input.dogId,
            event: uiEventToApiType(input.eventType),
            occurredAt: input.occurredAt,
            latitude: input.lat,
            longitude: input.lng,
          },
        },
      );
      return mapApiWalkDogEvent(data.addEvent, input.walkId, input.dogId);
    },
  });
}

// 散歩イベント写真を直接アップロードするための署名付き URL を発行します。
export function useGenerateWalkEventPhotoUploadUrl(): UseMutationResult<
  never,
  Error,
  { walkId: string; contentType: string }
> {
  return useMutation<never, Error, { walkId: string; contentType: string }>({
    mutationFn: async () => {
      throw new Error('Walk photo presigned upload URLs are not supported by the current GraphQL schema.');
    },
  });
}
