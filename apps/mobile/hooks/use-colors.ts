import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, type ColorTokens } from '@/theme/tokens';

// 現在のカラースキームに対応するテーマトークンを返します。
export function useColors(): ColorTokens {
  const colorScheme = useColorScheme();
  return colors[colorScheme ?? 'light'];
}
