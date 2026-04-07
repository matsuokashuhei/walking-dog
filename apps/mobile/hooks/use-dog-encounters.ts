import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/graphql/client';
import { DOG_ENCOUNTERS_QUERY } from '@/lib/graphql/queries';
import { encounterKeys } from '@/lib/graphql/keys';
import { useAuthStore } from '@/stores/auth-store';
import type { DogEncountersResponse, Encounter } from '@/types/graphql';

export function useDogEncounters(dogId: string, limit = 20, offset = 0) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Encounter[]>({
    queryKey: [...encounterKeys.byDog(dogId), limit, offset],
    queryFn: async () => {
      const data = await authenticatedRequest<DogEncountersResponse>(
        DOG_ENCOUNTERS_QUERY,
        { dogId, limit, offset },
      );
      return data.dogEncounters;
    },
    enabled: isAuthenticated && !!dogId,
  });
}
