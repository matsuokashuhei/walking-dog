import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { colors, type ColorTokens } from '@/theme/tokens';

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (theme: ColorTokens) => T;

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: StyleFactory<T>): T {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}
