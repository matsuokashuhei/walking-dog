import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useColors } from '@/hooks/use-colors';

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
      return { background: 'rgba(255,59,48,0.1)', text: theme.error };
    case 'success':
      return { background: 'rgba(48,209,88,0.14)', text: '#1f7a38' };
    case 'warning':
      return { background: 'rgba(255,159,10,0.15)', text: '#b15e00' };
    case 'info':
      return { background: 'rgba(10,132,255,0.14)', text: '#0a4fa3' };
    case 'accent':
      return { background: 'rgba(191,90,242,0.14)', text: '#7a2fb0' };
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
