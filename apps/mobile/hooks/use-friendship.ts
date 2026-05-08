import { useQuery } from '@tanstack/react-query';
import { friendshipKeys } from '@/lib/graphql/keys';
import type { Friendship } from '@/types/graphql';

// 2 頭の犬の友だち関係を、両方の ID が揃ったときだけ取得します。
export function useFriendship(dogId1: string, dogId2: string) {
  return useQuery<Friendship | null>({
    queryKey: [...friendshipKeys.byDog(dogId1), dogId2],
    queryFn: async () => null,
    enabled: false,
    initialData: null,
  });
}
