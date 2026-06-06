import { useMemo } from 'react';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import type { Dog } from '@/types/graphql';

// 記録中の表示対象犬を、最新の user dog list と active session snapshot から復元します。
export function useRecordingWalkDogs(): Dog[] {
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const storedDogs = useWalkStore((s) => s.dogs);
  const { data: me } = useMe();

  return useMemo<Dog[]>(() => {
    const dogs = (me?.dogs ?? []).filter((d) => selectedDogIds.includes(d.id));
    return dogs.length > 0 ? dogs : storedDogs;
  }, [me?.dogs, selectedDogIds, storedDogs]);
}
