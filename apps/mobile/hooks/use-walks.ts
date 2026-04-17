import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { WALK_QUERY, MY_WALKS_QUERY } from '@/lib/graphql/queries';
import { walkKeys } from '@/lib/graphql/keys';
import { useIsAuthenticated } from './use-is-authenticated';
import type { Walk, WalkResponse, MyWalksResponse } from '@/types/graphql';

export function useWalk(id: string) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<Walk | null>({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await authenticatedRequest<WalkResponse>(WALK_QUERY, { id });
      return data.walk;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useMyWalks(limit = 20) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<Walk[]>({
    queryKey: walkKeys.list(),
    queryFn: async () => {
      const data = await authenticatedRequest<MyWalksResponse>(MY_WALKS_QUERY, {
        limit,
        offset: 0,
      });
      return data.myWalks;
    },
    enabled: isAuthenticated,
  });
}
