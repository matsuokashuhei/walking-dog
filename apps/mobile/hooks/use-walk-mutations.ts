import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import {
  START_WALK_MUTATION,
  FINISH_WALK_MUTATION,
  ADD_WALK_POINTS_MUTATION,
} from '@/lib/graphql/mutations';
import { walkKeys } from '@/lib/graphql/keys';
import type {
  Walk,
  WalkPointInput,
  StartWalkResponse,
  FinishWalkResponse,
  AddWalkPointsResponse,
} from '@/types/graphql';

export function useStartWalk() {
  return useMutation<Walk, Error, string[]>({
    mutationFn: async (dogIds) => {
      const data = await graphqlClient.request<StartWalkResponse>(
        START_WALK_MUTATION,
        { dogIds },
      );
      return data.startWalk;
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
    },
  });
}

export function useAddWalkPoints() {
  return useMutation<boolean, Error, { walkId: string; points: WalkPointInput[] }>({
    mutationFn: async ({ walkId, points }) => {
      const data = await graphqlClient.request<AddWalkPointsResponse>(
        ADD_WALK_POINTS_MUTATION,
        { walkId, points },
      );
      return data.addWalkPoints;
    },
  });
}
