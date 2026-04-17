import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export function useMutationWithAlert() {
  const { t } = useTranslation();
  return useCallback(
    async <T>(fn: () => Promise<T>, errorMessageKey: string): Promise<T | null> => {
      try {
        return await fn();
      } catch {
        Alert.alert(t('common.error'), t(errorMessageKey));
        return null;
      }
    },
    [t],
  );
}
