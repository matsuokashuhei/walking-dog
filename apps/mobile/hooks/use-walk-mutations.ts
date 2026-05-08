import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  START_WALK_MUTATION,
  FINISH_WALK_MUTATION,
  ADD_WALK_POINTS_MUTATION,
} from '@/lib/graphql/mutations/walk';
import { walkKeys } from '@/lib/graphql/keys';
import { mapApiTrackPoint, mapApiWalk } from '@/lib/graphql/adapters';
import type {
  Walk,
  WalkPointInput,
  StartWalkResponse,
  FinishWalkResponse,
  AddWalkPointsResponse,
} from '@/types/graphql';

// 選択した犬 ID で散歩を開始します。
export function useStartWalk() {
  return useMutation<Walk, Error, string[]>({
    mutationFn: async (dogIds) => {
      const data = await authenticatedRequest<StartWalkResponse>(
        START_WALK_MUTATION,
        { input: { dogIds } },
      );
      return mapApiWalk(data.startWalk);
    },
  });
}

// 散歩終了後、散歩一覧・詳細のキャッシュを更新します。
export function useFinishWalk() {
  const queryClient = useQueryClient();
  return useMutation<Walk, Error, { walkId: string; distanceM?: number }>({
    mutationFn: async ({ walkId }) => {
      const data = await authenticatedRequest<FinishWalkResponse>(
        FINISH_WALK_MUTATION,
        { input: { id: walkId } },
      );
      return mapApiWalk(data.endWalk);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walkKeys.all });
    },
  });
}

// GPS 点をサーバーへまとめて追加します。
export function useAddWalkPoints() {
  return useMutation<boolean, Error, { walkId: string; points: WalkPointInput[] }>({
    mutationFn: async ({ walkId, points }) => {
      for (const point of points) {
        const data = await authenticatedRequest<AddWalkPointsResponse>(
          ADD_WALK_POINTS_MUTATION,
          {
            input: {
              walkId,
              trackedAt: point.recordedAt,
              latitude: point.lat,
              longitude: point.lng,
            },
          },
        );
        mapApiTrackPoint(data.trackPoint);
      }
      return true;
    },
  });
}
