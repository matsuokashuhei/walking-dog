import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatTime, formatDistance } from '@/lib/walk/format';

export function WalkSummaryCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const reset = useWalkStore((s) => s.reset);

  const elapsedSec = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('walk.finished.title')}</Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatTime(elapsedSec)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.time')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDistance(totalDistanceM)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
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
          style={[styles.button, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {t('walk.finished.details')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('walk.finished.walkAgain')}
          onPress={reset}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {t('walk.finished.walkAgain')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.lg },
  card: { borderRadius: radius.md, padding: spacing.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonText: { ...typography.button },
});
