import { View, type ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors } from '@/theme/tokens';

interface ThemedViewProps extends ViewProps {
  surface?: 'background' | 'surface' | 'surfaceContainer' | 'surfaceContainerHigh' | 'surfaceContainerLowest';
}

export function ThemedView({ style, surface = 'background', ...rest }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return <View style={[{ backgroundColor: theme[surface] }, style]} {...rest} />;
}
