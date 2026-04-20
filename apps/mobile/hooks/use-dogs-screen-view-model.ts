import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMe } from '@/hooks/use-me';
import { usePackProgress } from '@/hooks/use-pack-progress';
import type { Dog } from '@/types/graphql';

export interface DogsScreenViewModel {
  dogs: Dog[];
  pack: ReturnType<typeof usePackProgress>;
  isLoading: boolean;
  handleAddDog: () => void;
  handleOpenDog: (dogId: string) => void;
  handleRefresh: () => void;
}

export function useDogsScreenViewModel(): DogsScreenViewModel {
  const router = useRouter();
  const { data: me, isLoading, refetch } = useMe();
  const pack = usePackProgress();

  const handleAddDog = useCallback(() => {
    router.push('/dogs/new');
  }, [router]);

  const handleOpenDog = useCallback(
    (dogId: string) => {
      router.push(`/dogs/${dogId}`);
    },
    [router],
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    dogs: me?.dogs ?? [],
    pack,
    isLoading,
    handleAddDog,
    handleOpenDog,
    handleRefresh,
  };
}
