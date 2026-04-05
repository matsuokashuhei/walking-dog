import { View, useColorScheme } from 'react-native';
import { colors } from '@/theme/tokens';

interface DividerProps {
  opacity?: number;
}

export function Divider({ opacity = 0.2 }: DividerProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.border,
        opacity,
      }}
    />
  );
}
