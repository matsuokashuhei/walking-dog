import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { ME_QUERY } from '@/lib/graphql/queries';
import { meKeys } from '@/lib/graphql/keys';
import type { MeResponse, User } from '@/types/graphql';

export function useMe() {
  return useQuery<User>({
    queryKey: meKeys.all,
    queryFn: async () => {
      const data = await graphqlClient.request<MeResponse>(ME_QUERY);
      return data.me;
    },
  });
}
