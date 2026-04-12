import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatTime, formatDistance } from '@/lib/walk/format';

export function WalkSummaryCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const reset = useWalkStore((s) => s.reset);

  const elapsedSec = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.onSurface }]}>{t('walk.finished.title')}</Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surfaceContainerLowest,
            borderColor: theme.border + '33',
          },
        ]}
      >
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.onSurface }]}>
              {formatTime(elapsedSec)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
              {t('walk.recording.time')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.onSurface }]}>
              {formatDistance(totalDistanceM)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
              {t('walk.recording.distance')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('walk.finished.details')}
          onPress={() => {
            if (walkId) router.push(`/walks/${walkId}`);
          }}
          style={[
            styles.button,
            {
              backgroundColor: theme.surfaceContainerLowest,
              borderColor: theme.border + '33',
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.onSurface }]}>
            {t('walk.finished.details')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('walk.finished.done')}
          onPress={reset}
          style={[styles.button, { backgroundColor: theme.interactive }]}
        >
          <Text style={[styles.buttonText, { color: theme.onInteractive }]}>
            {t('walk.finished.done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.lg },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { ...typography.label, marginTop: spacing.xs },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  buttonText: { ...typography.button },
});
