import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { USER_QUERY } from '@/lib/graphql/queries/me';
import { meKeys } from '@/lib/graphql/keys';
import { mapApiUser } from '@/lib/graphql/adapters';
import { useIsAuthenticated } from './use-is-authenticated';
import type { UserResponse, User } from '@/types/graphql';

// 認証済みのときだけ現在ユーザー情報を取得します。
export function useMe() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<User>({
    queryKey: meKeys.all,
    queryFn: async () => {
      const data = await authenticatedRequest<UserResponse>(USER_QUERY);
      return mapApiUser(data.user);
    },
    enabled: isAuthenticated,
  });
}
