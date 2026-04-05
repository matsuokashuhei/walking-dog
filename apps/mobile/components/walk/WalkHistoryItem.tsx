import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Walk } from '@/types/graphql';

interface WalkHistoryItemProps {
  walk: Walk;
}

export function WalkHistoryItem({ walk }: WalkHistoryItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();

  const date = new Date(walk.startedAt);
  const dateStr = date.toLocaleDateString();
  const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
  const distanceKm = walk.distanceM ? (walk.distanceM / 1000).toFixed(1) : '0';
  const dogNames = walk.dogs.map((d) => d.name).join(', ');

  const walker = walk.walker;
  const walkerInitial = walker?.displayName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dateStr} ${dogNames}`}
      onPress={() => router.push(`/walks/${walk.id}`)}
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.date, { color: theme.onSurfaceVariant }]}>{dateStr}</Text>
          <Text style={[styles.dogs, { color: theme.onSurfaceVariant }]}>{dogNames}</Text>
        </View>
        {walker ? (
          <View style={styles.walkerRow}>
            {walker.avatarUrl ? (
              <Image
                source={{ uri: walker.avatarUrl }}
                style={styles.walkerAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={walker.displayName ?? ''}
              />
            ) : (
              <View
                style={[styles.walkerAvatar, styles.walkerInitialBg, { backgroundColor: theme.interactive }]}
              >
                <Text style={[styles.walkerInitialText, { color: theme.onInteractive }]}>
                  {walkerInitial}
                </Text>
              </View>
            )}
            <Text
              testID="walker-name"
              style={[styles.walkerName, { color: theme.onSurfaceVariant }]}
            >
              {walker.displayName}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.stats}>
        <Text style={[styles.stat, { color: theme.onSurface }]}>
          {t('walk.history.minutes', { count: durationMin })}
        </Text>
        <Text style={[styles.distanceStat, { color: theme.onSurface }]}>
          {t('walk.history.km', { value: distanceKm })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flex: 1 },
  date: { ...typography.label },
  dogs: { ...typography.caption, marginTop: spacing.xs },
  walkerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  walkerAvatar: { width: 24, height: 24, borderRadius: radius.full },
  walkerInitialBg: { alignItems: 'center', justifyContent: 'center' },
  walkerInitialText: { fontSize: 12, fontWeight: '600' as const },
  walkerName: { ...typography.caption },
  stats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  stat: { ...typography.body },
  distanceStat: { ...typography.h3 },
});
