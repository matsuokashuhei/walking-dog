import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMe } from '@/hooks/use-me';
import { useMyWalks } from '@/hooks/use-walks';
import type { DogWithStats, StatsPeriod } from '@/types/graphql';

// 犬の詳細と期間別統計を取得し、ID が未確定の間は問い合わせを止めます。
export function useDog(id: string, period: StatsPeriod = 'ALL') {
  const meQuery = useMe();
  const walksQuery = useMyWalks(100);

  return useMemo(() => {
    const dog = meQuery.data?.dogs.find((candidate) => candidate.id === id) ?? null;
    const dogWalks = dog
      ? (walksQuery.data ?? []).filter((walk) =>
          walk.dogs.some((walkDog) => walkDog.id === dog.id),
        )
      : [];
    const totalDistanceM = dogWalks.reduce((total, walk) => total + (walk.distance ?? 0), 0);
    const totalDurationSec = dogWalks.reduce((total, walk) => total + (walk.durationSec ?? 0), 0);
    const data: DogWithStats | null = dog
      ? {
          ...dog,
          walkStats: {
            totalWalks: dogWalks.length,
            totalDistanceM,
            totalDurationSec,
          },
          members: [],
        }
      : null;

    return ({
      ...meQuery,
      data,
      isLoading: meQuery.isLoading || walksQuery.isLoading,
      isFetching: meQuery.isFetching || walksQuery.isFetching,
      error: meQuery.error ?? walksQuery.error,
      refetch: meQuery.refetch,
    } as unknown) as UseQueryResult<DogWithStats | null, Error>;
  }, [id, meQuery, period, walksQuery]);
}
