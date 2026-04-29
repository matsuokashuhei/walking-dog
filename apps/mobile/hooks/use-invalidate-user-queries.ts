import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { meKeys, dogKeys } from '@/lib/graphql/keys';

// ユーザー情報と犬一覧に影響する変更後、関連クエリをまとめて無効化します。
export function useInvalidateUserQueries(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: meKeys.all }),
      queryClient.invalidateQueries({ queryKey: dogKeys.all }),
    ]);
  }, [queryClient]);
}
