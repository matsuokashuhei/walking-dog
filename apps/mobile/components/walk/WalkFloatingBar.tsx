import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { elevation, spacing, typography } from '@/theme/tokens';
import { WalkTopChip } from './WalkTopChip';
import type { Dog } from '@/types/graphql';

interface WalkFloatingBarProps {
  dogs: Dog[];
  isMinimized: boolean;
  isHybridMap: boolean;
  onMinimize: () => void;
  onToggleMapType: () => void;
}

export function WalkFloatingBar({
  dogs,
  isMinimized,
  isHybridMap,
  onMinimize,
  onToggleMapType,
}: WalkFloatingBarProps) {
  const { t } = useTranslation();
  const theme = useColors();

  if (dogs.length === 0) return null;

  return (
    <View style={styles.bar}>
      <FloatingButton
        label="X"
        accessibilityLabel={t('walk.recording.minimize')}
        onPress={onMinimize}
        disabled={isMinimized}
        theme={{ background: theme.material, border: theme.border, text: theme.onSurface }}
      />

      <View style={styles.center}>
        <WalkTopChip dogs={dogs} />
      </View>

      <FloatingButton
        label={isHybridMap ? t('walk.recording.mapLabel') : t('walk.recording.satelliteLabel')}
        accessibilityLabel={t('walk.recording.toggleMapStyle')}
        onPress={onToggleMapType}
        theme={{ background: theme.material, border: theme.border, text: theme.onSurface }}
      />
    </View>
  );
}

interface FloatingButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  theme: { background: string; border: string; text: string };
}

function FloatingButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  theme,
}: FloatingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1,
        },
        elevation.low,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...typography.footnote,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
