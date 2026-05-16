import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { WALK_QUERY, WALKS_QUERY } from '@/lib/graphql/queries/walk';
import { walkKeys } from '@/lib/graphql/keys';
import { mapApiWalk } from '@/lib/graphql/adapters';
import { useIsAuthenticated } from './use-is-authenticated';
import type { Walk, WalkResponse, WalksResponse } from '@/types/graphql';

// 認証済みかつ散歩 ID がある場合だけ、散歩詳細を取得します。
// refetchIntervalMs を指定すると、散歩中の distance などサーバ計算値を
// ポーリングで取り込めます。
export function useWalk(id: string, options?: { refetchIntervalMs?: number }) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<Walk | null>({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await authenticatedRequest<WalkResponse>(WALK_QUERY, { id });
      return mapApiWalk(data.walk);
    },
    enabled: isAuthenticated && !!id,
    refetchInterval: options?.refetchIntervalMs,
  });
}

// 現在ユーザーの散歩履歴を、指定件数まで取得します。
export function useMyWalks(limit = 20) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<Walk[]>({
    queryKey: walkKeys.list(limit),
    queryFn: async () => {
      const data = await authenticatedRequest<WalksResponse>(WALKS_QUERY, { first: limit });
      return data.user.walks.nodes.map(mapApiWalk);
    },
    enabled: isAuthenticated,
  });
}
