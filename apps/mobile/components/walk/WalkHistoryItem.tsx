import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Walk } from '@/types/graphql';

interface WalkHistoryItemProps {
  walk: Walk;
}

export function WalkHistoryItem({ walk }: WalkHistoryItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const date = new Date(walk.startedAt);
  const dateStr = date.toLocaleDateString();
  const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
  const distanceKm = walk.distanceM ? (walk.distanceM / 1000).toFixed(1) : '0';
  const dogNames = walk.dogs.map((d) => d.name).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dateStr} ${dogNames}`}
      onPress={() => router.push(`/walks/${walk.id}`)}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.text }]}>{dateStr}</Text>
        <Text style={[styles.dogs, { color: colors.textSecondary }]}>{dogNames}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.stat, { color: colors.text }]}>
          {t('walk.history.minutes', { count: durationMin })}
        </Text>
        <Text style={[styles.stat, { color: colors.text }]}>
          {t('walk.history.km', { value: distanceKm })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...typography.bodyMedium },
  dogs: { ...typography.caption },
  stats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  stat: { ...typography.body },
});
