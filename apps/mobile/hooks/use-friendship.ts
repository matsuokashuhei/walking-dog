import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { FRIENDSHIP_QUERY } from '@/lib/graphql/queries';
import { friendshipKeys } from '@/lib/graphql/keys';
import { useAuthStore } from '@/stores/auth-store';
import type { FriendshipResponse, Friendship } from '@/types/graphql';

export function useFriendship(dogId1: string, dogId2: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Friendship | null>({
    queryKey: [...friendshipKeys.byDog(dogId1), dogId2],
    queryFn: async () => {
      const data = await authenticatedRequest<FriendshipResponse>(
        FRIENDSHIP_QUERY,
        { dogId1, dogId2 },
      );
      return data.friendship;
    },
    enabled: isAuthenticated && !!dogId1 && !!dogId2,
  });
}
