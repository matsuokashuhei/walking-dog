import { useCallback, useEffect, useMemo } from 'react';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import type { Dog } from '@/types/graphql';

interface UseWalkReadySelectionOptions {
  enabled?: boolean;
}

export interface WalkReadySelection {
  dogs: Dog[];
  selectedDogs: Dog[];
  validSelectedDogIds: string[];
  isSingleDog: boolean;
  allSelected: boolean;
  selectDog: (dogId: string) => void;
  handleSelectAll: () => void;
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

// 開始前の犬選択状態を一箇所に集約し、マップ上部チップと下部シートで共有します。
export function useWalkReadySelection({
  enabled = true,
}: UseWalkReadySelectionOptions = {}): WalkReadySelection {
  const { data: me } = useMe();
  const dogs = useMemo<Dog[]>(() => me?.dogs ?? [], [me?.dogs]);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const selectDog = useWalkStore((s) => s.selectDog);
  const setSelectedDogs = useWalkStore((s) => s.setSelectedDogs);

  const isSingleDog = dogs.length === 1;
  const dogIds = useMemo(() => dogs.map((dog) => dog.id), [dogs]);
  const validSelectedDogIds = useMemo(
    () => selectedDogIds.filter((id) => dogIds.includes(id)),
    [dogIds, selectedDogIds],
  );
  const selectedDogs = useMemo(
    () => dogs.filter((dog) => validSelectedDogIds.includes(dog.id)),
    [dogs, validSelectedDogIds],
  );

  useEffect(() => {
    if (!enabled) return;

    const nextSelectedDogIds =
      isSingleDog && validSelectedDogIds.length === 0 ? [dogs[0].id] : validSelectedDogIds;

    if (!sameIds(selectedDogIds, nextSelectedDogIds)) {
      setSelectedDogs(nextSelectedDogIds);
    }
  }, [dogs, enabled, isSingleDog, selectedDogIds, setSelectedDogs, validSelectedDogIds]);

  const allSelected =
    dogs.length > 0 && dogs.every((d) => validSelectedDogIds.includes(d.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedDogs([]);
    } else {
      setSelectedDogs(dogs.map((d) => d.id));
    }
  }, [allSelected, dogs, setSelectedDogs]);

  return {
    dogs,
    selectedDogs,
    validSelectedDogIds,
    isSingleDog,
    allSelected,
    selectDog,
    handleSelectAll,
  };
}
