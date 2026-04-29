import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

type ErrorMessageKey = string;
type ErrorMessageResolver = (error: unknown) => ErrorMessageKey;

// ミューテーション失敗時のアラート表示を共通化し、成功時だけ結果を返します。
export function useMutationWithAlert() {
  const { t } = useTranslation();
  return useCallback(
    async <T>(
      fn: () => Promise<T>,
      errorMessage: ErrorMessageKey | ErrorMessageResolver,
      // 監視用メタデータを渡す既存呼び出しとの互換性のために残しています。
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
