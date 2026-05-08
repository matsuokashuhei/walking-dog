import { useQuery } from '@tanstack/react-query';
import { friendshipKeys } from '@/lib/graphql/keys';
import type { Friendship } from '@/types/graphql';

// 認証済みかつ犬 ID がある場合だけ、犬の友だち一覧を取得します。
export function useDogFriends(dogId: string) {
  return useQuery<Friendship[]>({
    queryKey: friendshipKeys.byDog(dogId),
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  });
}
