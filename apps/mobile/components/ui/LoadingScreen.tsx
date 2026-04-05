import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export function LoadingScreen() {
  const theme = useColors();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.interactive} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
