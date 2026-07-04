import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView, type BlurTint } from 'expo-blur';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { dogContactChrome, spacing } from '@/theme/tokens';

type DogContactChromeButtonShape = 'circle' | 'pill';

interface DogContactChromeButtonProps {
  shape: DogContactChromeButtonShape;
  label: string;
  onPress: () => void;
  iconName?: ComponentProps<typeof IconSymbol>['name'];
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function DogContactChromeButton({
  shape,
  label,
  onPress,
  iconName,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: DogContactChromeButtonProps) {
  const isCircle = shape === 'circle';
  const theme = useColors();
  const colorScheme = useColorScheme();
  const blurTint: BlurTint =
    colorScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
  const chromeColorStyle = {
    backgroundColor: theme.background,
    borderColor: theme.border,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.step12}
      onPress={onPress}
      style={[
        styles.base,
        chromeColorStyle,
        isCircle ? styles.circle : styles.pill,
        disabled ? styles.disabled : null,
        style,
      ]}
      testID={testID}
    >
      <BlurView
        intensity={dogContactChrome.blurIntensity}
        tint={blurTint}
        style={[styles.blur, { backgroundColor: theme.background }]}
      >
        {iconName ? (
          <IconSymbol
            name={iconName}
            size={dogContactChrome.iconSize}
            color={theme.onSurface}
            weight="semibold"
          />
        ) : (
          <Text style={[styles.label, { color: theme.onSurface }]}>{label}</Text>
        )}
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  circle: {
    width: dogContactChrome.circleSize,
    height: dogContactChrome.circleSize,
    borderRadius: dogContactChrome.circleRadius,
  },
  pill: {
    minWidth: dogContactChrome.pillMinWidth,
    height: dogContactChrome.pillHeight,
    borderRadius: dogContactChrome.pillRadius,
  },
  blur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dogContactChrome.pillPaddingH,
  },
  label: {
    ...dogContactChrome.labelFont,
  },
  disabled: {
    opacity: dogContactChrome.disabledOpacity,
  },
});
