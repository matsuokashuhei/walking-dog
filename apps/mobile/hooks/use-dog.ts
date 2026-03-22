import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { DOG_QUERY } from '@/lib/graphql/queries';
import { dogKeys } from '@/lib/graphql/keys';
import type { DogResponse, DogWithStats, StatsPeriod } from '@/types/graphql';

export function useDog(id: string, period: StatsPeriod = 'ALL') {
  return useQuery<DogWithStats | null>({
    queryKey: dogKeys.detail(id, period),
    queryFn: async () => {
      const data = await graphqlClient.request<DogResponse>(DOG_QUERY, {
        id,
        statsPeriod: period,
      });
      return data.dog;
    },
    enabled: !!id,
  });
}
