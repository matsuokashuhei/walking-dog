import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: deleteDog } = useDeleteDog();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handleDelete() {
    try {
      await deleteDog(id);
      router.replace('/(tabs)/dogs');
    } catch {
      Alert.alert(t('common.error'), t('dogs.detail.deleteError'));
    }
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

      {dog.walkStats ? (
        <View style={styles.statsSection}>
          <DogStatsCard stats={dog.walkStats} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t('dogs.detail.edit')}
          variant="secondary"
          onPress={() => router.push(`/dogs/${id}/edit`)}
        />
        <View style={{ width: spacing.sm }} />
        <Button
          label={t('dogs.detail.delete')}
          variant="destructive"
          onPress={() => setShowDeleteConfirm(true)}
        />
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title={t('dogs.detail.deleteTitle')}
        message={t('dogs.detail.deleteConfirm', { name: dog.name })}
        confirmLabel={t('dogs.detail.delete')}
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
