import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  RECORD_ENCOUNTER_MUTATION,
  UPDATE_ENCOUNTER_DURATION_MUTATION,
} from '@/lib/graphql/mutations';
import { friendshipKeys, encounterKeys } from '@/lib/graphql/keys';
import type {
  RecordEncounterResponse,
  UpdateEncounterDurationResponse,
} from '@/types/graphql';

export function useRecordEncounter() {
  const queryClient = useQueryClient();
  return useMutation<
    RecordEncounterResponse,
    Error,
    { myWalkId: string; theirWalkId: string }
  >({
    mutationFn: async ({ myWalkId, theirWalkId }) => {
      return authenticatedRequest<RecordEncounterResponse>(
        RECORD_ENCOUNTER_MUTATION,
        { myWalkId, theirWalkId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    },
  });
}

export function useUpdateEncounterDuration() {
  return useMutation<
    UpdateEncounterDurationResponse,
    Error,
    { myWalkId: string; theirWalkId: string; durationSec: number }
  >({
    mutationFn: async ({ myWalkId, theirWalkId, durationSec }) => {
      return authenticatedRequest<UpdateEncounterDurationResponse>(
        UPDATE_ENCOUNTER_DURATION_MUTATION,
        { myWalkId, theirWalkId, durationSec },
      );
    },
  });
}
