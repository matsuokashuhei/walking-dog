import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, type ColorTokens } from '@/theme/tokens';

export function useColors(): ColorTokens {
  const colorScheme = useColorScheme();
  return colors[colorScheme ?? 'light'];
}
