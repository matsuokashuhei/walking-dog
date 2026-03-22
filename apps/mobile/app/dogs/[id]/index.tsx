import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog } from '@/hooks/use-dog-mutations';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius } from '@/theme/tokens';

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: deleteDog } = useDeleteDog();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handleDelete() {
    await deleteDog(id);
    router.replace('/(tabs)/dogs');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.photoSection}>
        <Image
          source={dog.photoUrl ?? require('@/assets/images/icon.png')}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.infoSection}>
        <ThemedText type="title">{dog.name}</ThemedText>
        {dog.breed ? (
          <ThemedText style={{ color: colors.textSecondary }}>{dog.breed}</ThemedText>
        ) : null}
      </View>

      <View style={styles.statsSection}>
        <DogStatsCard stats={dog.walkStats} />
      </View>

      <View style={styles.actions}>
        <Button
          label="編集"
          variant="secondary"
          onPress={() => router.push(`/dogs/${id}/edit`)}
        />
        <View style={{ width: spacing.sm }} />
        <Button
          label="削除"
          variant="destructive"
          onPress={() => setShowDeleteConfirm(true)}
        />
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="犬を削除"
        message={`${dog.name}を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  photoSection: { alignItems: 'center', paddingVertical: spacing.xl },
  photo: {
    width: 160,
    height: 160,
    borderRadius: radius.full,
  },
  infoSection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  statsSection: { padding: spacing.md },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: 0,
  },
});
