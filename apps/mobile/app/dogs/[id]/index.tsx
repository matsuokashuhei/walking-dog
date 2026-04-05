import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog } from '@/hooks/use-dog-mutations';
import { useMe } from '@/hooks/use-me';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { getPhotoUrl } from '@/lib/photo-url';

export default function DogDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { data: me } = useMe();
  const { mutateAsync: deleteDog } = useDeleteDog();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading || !dog) return <LoadingScreen />;

  const currentMember = dog.members?.find((m) => m.userId === me?.id);
  const isOwner = currentMember?.role === 'owner';

  async function handleDelete() {
    try {
      await deleteDog(id);
      router.replace('/(tabs)/dogs');
    } catch {
      Alert.alert(t('common.error'), t('dogs.detail.deleteError'));
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.photoSection}>
        <Image
          source={getPhotoUrl(dog.photoUrl) ?? require('@/assets/images/icon.png')}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.heroSection}>
        <Text style={[styles.dogName, { color: theme.onSurface }]}>{dog.name}</Text>
      </View>

      <View style={[styles.dataTable, { borderTopColor: theme.border + '33' }]}>
        {dog.breed ? (
          <View style={[styles.dataRow, { borderBottomColor: theme.border + '33' }]}>
            <Text style={[styles.dataLabel, { color: theme.onSurfaceVariant }]}>
              {t('dogs.detail.breed')}
            </Text>
            <Text style={[styles.dataValue, { color: theme.onSurface }]}>{dog.breed}</Text>
          </View>
        ) : null}
        {dog.gender ? (
          <View style={[styles.dataRow, { borderBottomColor: theme.border + '33' }]}>
            <Text style={[styles.dataLabel, { color: theme.onSurfaceVariant }]}>
              {t('dogs.detail.gender')}
            </Text>
            <Text style={[styles.dataValue, { color: theme.onSurface }]}>{dog.gender}</Text>
          </View>
        ) : null}
      </View>

      {dog.members && dog.members.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.detail.manageMembers')}
          style={[styles.membersRow, { borderColor: theme.border + '33' }]}
          onPress={() => router.push(`/dogs/${id}/members`)}
        >
          <View>
            <Text style={[styles.membersLabel, { color: theme.onSurface }]}>
              {t('dogs.detail.members')}
            </Text>
            <Text style={[styles.membersCount, { color: theme.onSurfaceVariant }]}>
              {t('dogs.detail.membersCount', { count: dog.members.length })}
            </Text>
          </View>
          <Text style={{ color: theme.onSurfaceVariant, fontSize: 20 }}>{'>'}</Text>
        </Pressable>
      ) : null}

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
        {isOwner ? (
          <>
            <View style={{ width: spacing.sm }} />
            <Button
              label={t('dogs.detail.delete')}
              variant="destructive"
              onPress={() => setShowDeleteConfirm(true)}
            />
          </>
        ) : null}
      </View>

      {isOwner ? (
        <ConfirmDialog
          visible={showDeleteConfirm}
          title={t('dogs.detail.deleteTitle')}
          message={t('dogs.detail.deleteConfirm', { name: dog.name })}
          confirmLabel={t('dogs.detail.delete')}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          destructive
        />
      ) : null}
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
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  dogName: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -0.96,
    textAlign: 'center',
  },
  dataTable: {
    marginHorizontal: spacing.lg,
    borderTopWidth: 1,
    marginBottom: spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  dataLabel: {
    ...typography.label,
  },
  dataValue: {
    ...typography.body,
  },
  membersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  membersLabel: {
    ...typography.bodyMedium,
  },
  membersCount: {
    ...typography.caption,
    marginTop: 2,
  },
  statsSection: { padding: spacing.md },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: 0,
  },
});
