import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

type ErrorMessageKey = string;
type ErrorMessageResolver = (error: unknown) => ErrorMessageKey;

export function useMutationWithAlert() {
  const { t } = useTranslation();
  return useCallback(
    async <T>(
      fn: () => Promise<T>,
      errorMessage: ErrorMessageKey | ErrorMessageResolver,
      // Retained on the signature for back-compat with callers that pass
      // observability metadata; it has no effect now that the Sentry
      // integration has been removed.
      _context?: Record<string, unknown>,
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        const errorMessageKey =
          typeof errorMessage === 'function' ? errorMessage(error) : errorMessage;
        Alert.alert(t('common.error'), t(errorMessageKey));
        return null;
      }
    },
    [t],
  );
}
