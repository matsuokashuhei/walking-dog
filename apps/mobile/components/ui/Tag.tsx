import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { components, tagColors } from '@/theme/tokens';

export type TagTone =
  | 'neutral'
  | 'live'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

interface TagProps extends Omit<ViewProps, 'children'> {
  label: string;
  tone?: TagTone;
}

export function Tag({ label, tone = 'neutral', testID, style, ...rest }: TagProps) {
  const theme = useColors();
  const palette = tonePalette(theme, tone);
  const dotId = testID ? `${testID}-dot` : undefined;

  return (
    <View
      testID={testID}
      style={[styles.pill, { backgroundColor: palette.background }, style]}
      {...rest}
    >
      {tone === 'live' && (
        <View testID={dotId} style={[styles.dot, { backgroundColor: palette.text }]} />
      )}
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function tonePalette(
  theme: ReturnType<typeof useColors>,
  tone: TagTone,
): { background: string; text: string } {
  switch (tone) {
    case 'live':
      return { background: tagColors.live.bg, text: tagColors.live.text };
    case 'success':
      return { background: tagColors.success.bg, text: tagColors.success.text };
    case 'warning':
      return { background: tagColors.warning.bg, text: tagColors.warning.text };
    case 'info':
      return { background: tagColors.tint.bg, text: tagColors.tint.text };
    case 'accent':
      return { background: tagColors.accent.bg, text: tagColors.accent.text };
    case 'neutral':
    default:
      return { background: theme.surfaceContainer, text: theme.onSurface };
  }
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: components.tag.paddingV,
    paddingHorizontal: components.tag.paddingH,
    borderRadius: components.tag.radius,
    gap: components.tag.gap,
  },
  dot: {
    width: components.tag.dot,
    height: components.tag.dot,
    borderRadius: components.tag.dot / 2,
  },
  label: {
    fontSize: components.tag.fontSize,
    fontWeight: components.tag.fontWeight,
  },
});
