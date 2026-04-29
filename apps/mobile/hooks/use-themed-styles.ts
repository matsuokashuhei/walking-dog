import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, type ColorTokens } from '@/theme/tokens';

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (theme: ColorTokens) => T;

// 現在のテーマ色を渡して StyleSheet を生成し、テーマ変更時だけ再計算します。
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: StyleFactory<T>): T {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
