import { useQuery } from '@tanstack/react-query';
import { encounterKeys } from '@/lib/graphql/keys';
import type { Encounter } from '@/types/graphql';

// 犬ごとの遭遇履歴をページング条件つきで取得します。
export function useDogEncounters(dogId: string, limit = 20, offset = 0) {
  return useQuery<Encounter[]>({
    queryKey: [...encounterKeys.byDog(dogId), limit, offset],
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  });
}
