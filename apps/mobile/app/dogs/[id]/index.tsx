import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog } from '@/hooks/use-dog-mutations';
import { useMe } from '@/hooks/use-me';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useDogDetailAuthorization } from '@/hooks/use-dog-detail-authorization';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { GroupedRow } from '@/components/ui/GroupedRow';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing } from '@/theme/tokens';

export default function DogDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { data: me } = useMe();
  const { mutateAsync: deleteDog } = useDeleteDog();
  const runWithAlert = useMutationWithAlert();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isOwner } = useDogDetailAuthorization(dog ?? undefined, me ?? undefined);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handleDelete() {
    const ok = await runWithAlert(() => deleteDog(id), 'dogs.detail.deleteError');
    if (ok) router.replace('/(tabs)/dogs');
  }

  const subtitle = [dog.breed, dog.gender].filter(Boolean).join(' · ');
  const memberCount = dog.members?.length ?? 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero — photo centered on a soft accent-gradient background */}
      <View style={[styles.hero, { backgroundColor: theme.surfaceContainer }]}>
        <Image
          source={dog.photoUrl ?? require('@/assets/images/icon.png')}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      {/* Name + breed/gender metadata */}
      <View style={styles.heroInfo}>
        <Text style={[styles.dogName, { color: theme.onSurface }]}>{dog.name}</Text>
        {subtitle ? (
          <Text style={[styles.dogMeta, { color: theme.onSurfaceVariant }]}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Stats card */}
      {dog.walkStats ? (
        <View style={styles.statsSection}>
          <DogStatsCard stats={dog.walkStats} />
        </View>
      ) : null}

      {/* Grouped navigation rows — Members (if any) + Friends */}
      <GroupedCard style={styles.group}>
        {memberCount > 0 ? (
          <GroupedRow
            label={t('dogs.detail.members')}
            value={t('dogs.detail.membersCount', { count: memberCount })}
            onPress={() => router.push(`/dogs/${id}/members`)}
          />
        ) : null}
        <GroupedRow
          label={t('dogs.detail.friends', 'Friends')}
          value={t('dogs.detail.viewFriendsList', 'View encounter history')}
          separator={false}
          onPress={() => router.push(`/dogs/${id}/friends`)}
        />
      </GroupedCard>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={t('dogs.detail.edit')}
          variant="secondary"
          onPress={() => router.push(`/dogs/${id}/edit`)}
          style={styles.actionButton}
        />
        {isOwner ? (
          <Button
            label={t('dogs.detail.delete')}
            variant="destructive"
            onPress={() => setShowDeleteConfirm(true)}
            style={styles.actionButton}
          />
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
  hero: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: radius.full,
  },
  heroInfo: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  dogName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
    textAlign: 'center',
  },
  dogMeta: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  group: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionButton: { flex: 1 },
});
