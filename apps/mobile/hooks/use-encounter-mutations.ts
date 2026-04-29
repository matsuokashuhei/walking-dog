import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  RECORD_ENCOUNTER_MUTATION,
  UPDATE_ENCOUNTER_DURATION_MUTATION,
} from '@/lib/graphql/mutations/encounter';
import { friendshipKeys, encounterKeys } from '@/lib/graphql/keys';
import type {
  Encounter,
  RecordEncounterResponse,
  UpdateEncounterDurationResponse,
} from '@/types/graphql';

// 犬同士の遭遇を記録し、友だち・遭遇関連のキャッシュを更新します。
export function useRecordEncounter() {
  const queryClient = useQueryClient();
  return useMutation<Encounter[], Error, { myWalkId: string; theirWalkId: string }>({
    mutationFn: async ({ myWalkId, theirWalkId }) => {
      const data = await authenticatedRequest<RecordEncounterResponse>(
        RECORD_ENCOUNTER_MUTATION,
        { myWalkId, theirWalkId },
      );
      return data.recordEncounter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    },
  });
}

// 確定した遭遇時間をサーバーへ反映します。
export function useUpdateEncounterDuration() {
  return useMutation<
    boolean,
    Error,
    { myWalkId: string; theirWalkId: string; durationSec: number }
  >({
    mutationFn: async ({ myWalkId, theirWalkId, durationSec }) => {
      const data = await authenticatedRequest<UpdateEncounterDurationResponse>(
        UPDATE_ENCOUNTER_DURATION_MUTATION,
        { myWalkId, theirWalkId, durationSec },
      );
      return data.updateEncounterDuration;
    },
  });
}
