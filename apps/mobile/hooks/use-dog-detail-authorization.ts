import { useMemo } from 'react';
import type { DogWithStats, User } from '@/types/graphql';

export interface DogDetailAuthorization {
  isOwner: boolean;
}

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
