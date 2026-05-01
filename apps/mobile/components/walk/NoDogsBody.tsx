import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { components, radius, spacing, typography } from '@/theme/tokens';

// 登録済みの犬がいない場合の案内と、犬登録画面への導線を表示します。
export function NoDogsBody() {
  const { t } = useTranslation();
  const theme = useColors();
  const router = useRouter();

  const ctaLabel = t('walk.ready.noDogsCta');
  // 空状態からすぐ散歩準備へ戻れるよう、犬の新規登録へ送ります。
  const handleAdd = () => router.push('/dogs/new');

  return (
    <View style={styles.container}>
      <View style={[styles.illustration, { backgroundColor: theme.surfaceContainer }]}>
        <Text style={styles.illustrationEmoji}>🐶</Text>
      </View>
      <Text style={[styles.title, { color: theme.onSurface }]}>
        {t('walk.ready.noDogsTitle')}
      </Text>
      <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>
        {t('walk.ready.noDogs')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        onPress={handleAdd}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.interactive, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.ctaLabel, { color: theme.onInteractive }]}>＋ {ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  illustration: {
    width: 96,
    height: 96,
    borderRadius: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  illustrationEmoji: {
    fontSize: spacing.step44,
  },
  title: {
    ...typography.title2,
    textAlign: 'center',
  },
  body: {
    ...typography.subheadline,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: typography.body.lineHeight,
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
  },
  ctaLabel: {
    ...components.button.fontPrimary,
    fontWeight: typography.headline.fontWeight,
  },
});
