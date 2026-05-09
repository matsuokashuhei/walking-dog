import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { WALK_QUERY, MY_WALKS_QUERY } from '@/lib/graphql/queries/walk';
import { walkKeys } from '@/lib/graphql/keys';
import { mapApiWalk } from '@/lib/graphql/adapters';
import { useIsAuthenticated } from './use-is-authenticated';
import type { Walk, WalkResponse, WalksResponse } from '@/types/graphql';

// 認証済みかつ散歩 ID がある場合だけ、散歩詳細を取得します。
export function useWalk(id: string) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<Walk | null>({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await authenticatedRequest<WalkResponse>(WALK_QUERY, { id });
      return mapApiWalk(data.walk);
    },
    enabled: isAuthenticated && !!id,
  });
}

// 現在ユーザーの散歩履歴を、指定件数まで取得します。
export function useMyWalks(limit = 20) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<Walk[]>({
    queryKey: walkKeys.list(limit),
    queryFn: async () => {
      const data = await authenticatedRequest<WalksResponse>(MY_WALKS_QUERY, { first: limit });
      return data.walks.nodes.map(mapApiWalk);
    },
    enabled: isAuthenticated,
  });
}
