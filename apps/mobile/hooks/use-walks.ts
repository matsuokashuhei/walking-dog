import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { WALK_QUERY, MY_WALKS_QUERY } from '@/lib/graphql/queries';
import { walkKeys } from '@/lib/graphql/keys';
import type { WalkResponse, MyWalksResponse, Walk } from '@/types/graphql';

export function useWalk(id: string) {
  return useQuery<Walk | null, Error>({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await graphqlClient.request<WalkResponse>(WALK_QUERY, { id });
      return data.walk;
    },
    enabled: !!id,
  });
}

export function useMyWalks(limit?: number, offset?: number) {
  return useQuery<Walk[], Error>({
    queryKey: [...walkKeys.list(), { limit, offset }],
    queryFn: async () => {
      const data = await graphqlClient.request<MyWalksResponse>(MY_WALKS_QUERY, {
        limit,
        offset,
      });
      return data.myWalks;
    },
  });
}
