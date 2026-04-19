import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useMyWalks } from '@/hooks/use-walks';
import { usePackProgress } from '@/hooks/use-pack-progress';
import { useDeleteDog } from '@/hooks/use-dog-mutations';
import { useMe } from '@/hooks/use-me';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useDogDetailAuthorization } from '@/hooks/use-dog-detail-authorization';
import { DogHero } from '@/components/dogs/DogHero';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { DogWalksList } from '@/components/dogs/DogWalksList';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { GroupedRow } from '@/components/ui/GroupedRow';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import type { Dog, Walk } from '@/types/graphql';

function computeAgeLabel(birthDate: Dog['birthDate'], now: Date = new Date()): string | null {
  if (!birthDate?.year) return null;
  const month = birthDate.month ?? 1;
  const day = birthDate.day ?? 1;
  const birth = new Date(birthDate.year, month - 1, day);
  let age = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age}y` : null;
}

function buildMeta(dog: Dog): string {
  const parts: string[] = [];
  const age = computeAgeLabel(dog.birthDate);
  if (age) parts.push(age);
  if (dog.breed) parts.push(dog.breed);
  else if (dog.gender) parts.push(dog.gender);
  return parts.join(' · ');
}

export default function DogDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { data: me } = useMe();
  const { data: walks = [] } = useMyWalks(100);
  const pack = usePackProgress();
  const { mutateAsync: deleteDog } = useDeleteDog();
  const runWithAlert = useMutationWithAlert();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isOwner } = useDogDetailAuthorization(dog ?? undefined, me ?? undefined);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handleDelete() {
    const ok = await runWithAlert(() => deleteDog(id), 'dogs.detail.deleteError');
    if (ok) router.replace('/(tabs)/dogs');
  }

  const dogWalks: Walk[] = walks.filter((walk) =>
    walk.dogs.some((walkDog) => walkDog.id === dog.id),
  );
  const streakDays = pack.perDog[dog.id]?.streakDays ?? 0;
  const meta = buildMeta(dog);
  const memberCount = dog.members?.length ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
    >
      <DogHero photoUrl={dog.photoUrl} />

      <View style={styles.nameBlock}>
        <Text style={[styles.dogName, { color: theme.onSurface }]}>{dog.name}</Text>
        {meta ? (
          <Text style={[styles.dogMeta, { color: theme.onSurfaceVariant }]}>{meta}</Text>
        ) : null}
      </View>

      {dog.walkStats ? (
        <View style={styles.statsSection}>
          <DogStatsCard stats={dog.walkStats} streakDays={streakDays} />
        </View>
      ) : null}

      <View style={styles.walksSection}>
        <DogWalksList
          walks={dogWalks}
          onPressWalk={(walkId) => router.push(`/walks/${walkId}`)}
        />
      </View>

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

      {isOwner ? (
        <View style={styles.actions}>
          <Button
            label={t('dogs.detail.delete')}
            variant="destructive"
            onPress={() => setShowDeleteConfirm(true)}
            style={styles.actionButton}
          />
        </View>
      ) : null}

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
  content: {
    paddingBottom: spacing.xxl,
  },
  nameBlock: {
    paddingHorizontal: spacing.step20,
    paddingTop: spacing.sm,
  },
  dogName: {
    ...typography.title1,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  dogMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  statsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  walksSection: {
    paddingHorizontal: spacing.xs,
  },
  group: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionButton: {
    width: '100%',
  },
});
