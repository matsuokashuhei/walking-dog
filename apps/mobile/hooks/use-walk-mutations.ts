import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import {
  START_WALK_MUTATION,
  END_WALK_MUTATION,
  TRACK_POINT_MUTATION,
} from '@/lib/graphql/mutations/walk';
import { walkKeys } from '@/lib/graphql/keys';
import { mapApiWalk } from '@/lib/graphql/adapters';
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
// distance はサーバ側で track_point から算出して保存されます。
export function useFinishWalk() {
  const queryClient = useQueryClient();
  return useMutation<Walk, Error, { walkId: string }>({
    mutationFn: async ({ walkId }) => {
      const data = await authenticatedRequest<FinishWalkResponse>(
        END_WALK_MUTATION,
        { input: { id: walkId } },
      );
      return mapApiWalk(data.endWalk);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walkKeys.all });
    },
  });
}

// API は trackPoint の単点 mutation を公開しているため、ローカルでまとめた GPS 点を順に送信します。
export function useAddWalkPoints() {
  return useMutation<boolean, Error, { walkId: string; points: WalkPointInput[] }>({
    mutationFn: async ({ walkId, points }) => {
      for (const point of points) {
        await authenticatedRequest<AddWalkPointsResponse>(TRACK_POINT_MUTATION, {
          input: {
            walkId,
            trackedAt: point.recordedAt,
            latitude: point.lat,
            longitude: point.lng,
          },
        });
      }
      return true;
    },
  });
}
