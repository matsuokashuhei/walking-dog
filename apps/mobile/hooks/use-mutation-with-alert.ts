import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { captureGraphQLError } from '@/lib/monitoring/sentry';

type ErrorMessageKey = string;
type ErrorMessageResolver = (error: unknown) => ErrorMessageKey;

export function useMutationWithAlert() {
  const { t } = useTranslation();
  return useCallback(
    async <T>(
      fn: () => Promise<T>,
      errorMessage: ErrorMessageKey | ErrorMessageResolver,
      context?: Record<string, unknown>,
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        const errorMessageKey =
          typeof errorMessage === 'function' ? errorMessage(error) : errorMessage;
        captureGraphQLError(error, context);
        Alert.alert(t('common.error'), t(errorMessageKey));
        return null;
      }
    },
    [t],
  );
}
