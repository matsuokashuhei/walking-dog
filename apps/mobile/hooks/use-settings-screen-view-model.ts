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

export type SettingsScreenViewModel =
  | (SettingsScreenBaseViewModel & { status: 'loading' })
  | (SettingsScreenBaseViewModel & { status: 'error' })
  | SettingsScreenReadyViewModel;

export function useSettingsScreenViewModel(): SettingsScreenViewModel {
  const { data: me, isLoading, error, refetch } = useMe();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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
