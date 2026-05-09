import { useMutation } from '@tanstack/react-query';
import type { Dog } from '@/types/graphql';

// 招待トークンを受け入れ、犬・ユーザー関連のキャッシュを更新します。
export function useAcceptInvitation() {
  return useMutation<Dog, Error, string>({
    mutationFn: async () => {
      throw new Error('Dog invitations are not supported by the current GraphQL schema.');
    },
  });
}
