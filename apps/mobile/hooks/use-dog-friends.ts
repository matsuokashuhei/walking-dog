import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { DOG_FRIENDS_QUERY } from '@/lib/graphql/queries';
import { friendshipKeys } from '@/lib/graphql/keys';
import { useAuthStore } from '@/stores/auth-store';
import type { DogFriendsResponse, Friendship } from '@/types/graphql';

export function useDogFriends(dogId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Friendship[]>({
    queryKey: friendshipKeys.byDog(dogId),
    queryFn: async () => {
      const data = await authenticatedRequest<DogFriendsResponse>(
        DOG_FRIENDS_QUERY,
        { dogId },
      );
      return data.dogFriends;
    },
    enabled: isAuthenticated && !!dogId,
  });
}
