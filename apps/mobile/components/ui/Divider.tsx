import { StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, spacing } from '@/theme/tokens';

export function Divider() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return (
    <View
      style={[styles.divider, { backgroundColor: theme.surface }]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: spacing.md,
  },
});
