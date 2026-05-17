import { useMemo } from 'react';
import type { DogWithStats } from '@/types/graphql';

// 犬詳細画面で現在ユーザーに許可される操作を表します。
export interface DogDetailAuthorization {
  isOwner: boolean;
}

// dog.role から、現在ユーザーが犬のオーナーかどうかを判定します。
export function useDogDetailAuthorization(
  dog: DogWithStats | undefined,
): DogDetailAuthorization {
  return useMemo(() => {
    if (!dog) return { isOwner: false };
    return { isOwner: dog.role === 'owner' };
  }, [dog]);
}
