import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Walk Detail</ThemedText>
      <ThemedText>Walk ID: {id}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
