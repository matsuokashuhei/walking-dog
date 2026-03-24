import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { WALK_QUERY, MY_WALKS_QUERY } from '@/lib/graphql/queries';
import { walkKeys } from '@/lib/graphql/keys';
import { useAuthStore } from '@/stores/auth-store';
import type { Walk, WalkResponse, MyWalksResponse } from '@/types/graphql';

export function useWalk(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Walk | null>({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await graphqlClient.request<WalkResponse>(WALK_QUERY, { id });
      return data.walk;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useMyWalks(limit = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Walk[]>({
    queryKey: walkKeys.list(),
    queryFn: async () => {
      const data = await graphqlClient.request<MyWalksResponse>(MY_WALKS_QUERY, {
        limit,
        offset: 0,
      });
      return data.myWalks;
    },
    enabled: isAuthenticated,
  });
}
