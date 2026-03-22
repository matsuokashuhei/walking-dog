import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import {
  START_WALK_MUTATION,
  FINISH_WALK_MUTATION,
} from '@/lib/graphql/mutations';
import { walkKeys, meKeys } from '@/lib/graphql/keys';
import type {
  Walk,
  StartWalkResponse,
  FinishWalkResponse,
} from '@/types/graphql';

export function useStartWalk() {
  const queryClient = useQueryClient();
  return useMutation<Walk, Error, string[]>({
    mutationFn: async (dogIds) => {
      const data = await graphqlClient.request<StartWalkResponse>(
        START_WALK_MUTATION,
        { dogIds },
      );
      return data.startWalk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walkKeys.all });
    },
  });
}

export function useFinishWalk() {
  const queryClient = useQueryClient();
  return useMutation<Walk, Error, string>({
    mutationFn: async (walkId) => {
      const data = await graphqlClient.request<FinishWalkResponse>(
        FINISH_WALK_MUTATION,
        { walkId },
      );
      return data.finishWalk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walkKeys.all });
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
