import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { ME_QUERY } from '@/lib/graphql/queries';
import { meKeys } from '@/lib/graphql/keys';
import { useAuthStore } from '@/stores/auth-store';
import type { MeResponse, User } from '@/types/graphql';

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<User>({
    queryKey: meKeys.all,
    queryFn: async () => {
      const data = await graphqlClient.request<MeResponse>(ME_QUERY);
      return data.me;
    },
    enabled: isAuthenticated,
  });
}
