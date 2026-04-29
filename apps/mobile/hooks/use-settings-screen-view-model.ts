import { useCallback } from 'react';
import { useMe } from '@/hooks/use-me';
import type { User } from '@/types/graphql';

type SettingsScreenStatus = 'loading' | 'error' | 'ready';

interface SettingsScreenBaseViewModel {
  status: SettingsScreenStatus;
  handleRetry: () => void;
}

interface SettingsScreenReadyViewModel extends SettingsScreenBaseViewModel {
  status: 'ready';
  me: User;
}

// Settings 画面が loading/error/ready を分岐するための ViewModel です。
export type SettingsScreenViewModel =
  | (SettingsScreenBaseViewModel & { status: 'loading' })
  | (SettingsScreenBaseViewModel & { status: 'error' })
  | SettingsScreenReadyViewModel;

// ユーザー情報取得と再試行操作を Settings 画面向けにまとめます。
export function useSettingsScreenViewModel(): SettingsScreenViewModel {
  const { data: me, isLoading, error, refetch } = useMe();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // 画面側がデータ有無を意識せず表示分岐できるよう、状態ごとに返却形を固定します。
  if (isLoading) {
    return { status: 'loading', handleRetry };
  }

  if (error || !me) {
    return { status: 'error', handleRetry };
  }

  return {
    status: 'ready',
    me,
    handleRetry,
  };
}
