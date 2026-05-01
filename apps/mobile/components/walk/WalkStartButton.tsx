import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { components, elevation, radius, spacing, typography } from '@/theme/tokens';

interface WalkStartButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

// 散歩開始の主操作ボタンです。開始中は押せない状態にして二重実行を防ぎます。
export function WalkStartButton({ onPress, disabled, loading }: WalkStartButtonProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const isInteractive = !disabled && !loading;
  const label = t('walk.ready.start');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isInteractive }}
      disabled={!isInteractive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.success,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        elevation.accentStart,
      ]}
    >
      {/* 開始処理中だけローディング表示に切り替え、通常時のラベルは保ちます。 */}
      {loading ? (
        <ActivityIndicator color={theme.onInteractive} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.icon, { color: theme.onInteractive }]}>▶</Text>
          <Text style={[styles.label, { color: theme.onInteractive }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: spacing.step60 - spacing.xs,
    borderRadius: radius.xxl + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step10,
  },
  icon: {
    fontSize: spacing.md,
  },
  label: {
    ...components.button.fontPrimary,
    fontSize: typography.headline.fontSize + StyleSheet.hairlineWidth,
    fontWeight: typography.largeTitle.fontWeight,
    letterSpacing: components.buttonCircle.letterSpacing + StyleSheet.hairlineWidth,
  },
});
