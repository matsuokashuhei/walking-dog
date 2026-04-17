import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { meKeys, dogKeys } from '@/lib/graphql/keys';

export function useInvalidateUserQueries(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: meKeys.all }),
      queryClient.invalidateQueries({ queryKey: dogKeys.all }),
    ]);
  }, [queryClient]);
}
