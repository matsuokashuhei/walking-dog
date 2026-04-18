import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { ME_QUERY } from '@/lib/graphql/queries/me';
import { meKeys } from '@/lib/graphql/keys';
import { useIsAuthenticated } from './use-is-authenticated';
import type { MeResponse, User } from '@/types/graphql';

export function useMe() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<User>({
    queryKey: meKeys.all,
    queryFn: async () => {
      const data = await authenticatedRequest<MeResponse>(ME_QUERY);
      return data.me;
    },
    enabled: isAuthenticated,
  });
}
