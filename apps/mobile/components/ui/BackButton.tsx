import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { layout, spacing, typography } from '@/theme/tokens';
import { IconSymbol } from './icon-symbol';

interface BackButtonProps {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function BackButton({
  onPress,
  label,
  accessibilityLabel,
  color,
  disabled = false,
  style,
  labelStyle,
  testID,
}: BackButtonProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const resolvedLabel = label ?? t('common.action.back');
  const actionColor = disabled ? theme.textDisabled : (color ?? theme.interactive);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? resolvedLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.step12}
      onPress={onPress}
      style={[styles.button, style]}
      testID={testID}
    >
      <IconSymbol
        name="chevron.backward"
        size={typography.body.fontSize}
        color={actionColor}
      />
      <Text style={[styles.label, { color: actionColor }, labelStyle]}>
        {resolvedLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: spacing.step60,
    minHeight: layout.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step6,
  },
  label: {
    ...typography.body,
  },
});
