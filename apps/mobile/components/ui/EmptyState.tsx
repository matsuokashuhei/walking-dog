import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ message, ctaLabel, onCta }: EmptyStateProps) {
  const theme = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>{message}</Text>
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} onPress={onCta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
