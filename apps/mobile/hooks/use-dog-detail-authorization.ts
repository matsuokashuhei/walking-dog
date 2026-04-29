import { useMemo } from 'react';
import type { DogWithStats, User } from '@/types/graphql';

// 犬詳細画面で現在ユーザーに許可される操作を表します。
export interface DogDetailAuthorization {
  isOwner: boolean;
}

// メンバー情報から、現在ユーザーが犬のオーナーかどうかを判定します。
export function useDogDetailAuthorization(
  dog: DogWithStats | undefined,
  me: User | undefined,
): DogDetailAuthorization {
  return useMemo(() => {
    if (!dog || !me) return { isOwner: false };
    const currentMember = dog.members?.find((m) => m.userId === me.id);
    return { isOwner: currentMember?.role === 'owner' };
  }, [dog, me]);
}
