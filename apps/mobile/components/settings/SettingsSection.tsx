import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { OutlinedCard } from '@/components/ui/OutlinedCard';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const theme = useColors();
  return (
    <OutlinedCard style={styles.section}>
      <Text style={[styles.title, { color: theme.onSurfaceVariant }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </OutlinedCard>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  title: {
    ...typography.label,
    marginBottom: spacing.md,
  },
});
