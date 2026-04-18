import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { spacing } from '@/theme/tokens';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  // Precise pattern: SectionHeader above the grouped card, not inside it.
  // Uppercase the string (not just textTransform) so existing getByText
  // matchers — including SettingsSection.test.tsx — keep matching "PROFILE".
  return (
    <View style={styles.wrapper}>
      <SectionHeader label={title.toUpperCase()} style={styles.header} />
      <GroupedCard padding="lg">{children}</GroupedCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  header: { paddingHorizontal: 0 },
});
