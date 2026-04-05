import { View, useColorScheme, type ViewProps } from 'react-native';
import { colors } from '@/theme/tokens';

interface ThemedViewProps extends ViewProps {
  surface?: 'background' | 'surface' | 'surfaceContainer' | 'surfaceContainerHigh';
}

export function ThemedView({ style, surface = 'background', ...rest }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return <View style={[{ backgroundColor: theme[surface] }, style]} {...rest} />;
}
