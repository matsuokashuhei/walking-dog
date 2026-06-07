import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

function subscribeToHydration() {
  return () => undefined;
}

// Web の静的レンダリング後に、クライアント側で OS のカラースキームを反映します。
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();

  // ハイドレーション前はサーバー出力と一致させるため light を返します。
  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
