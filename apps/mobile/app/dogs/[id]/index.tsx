import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDogDetailViewModel } from '@/hooks/use-dog-detail-view-model';
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

export default function DogDetailScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useDogDetailViewModel();

  if (vm.status === 'loading') return <LoadingScreen />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
    >
      <DogHero photoUrl={vm.dog.photoUrl} />

      <View style={styles.nameBlock}>
        <Text style={[styles.dogName, { color: theme.onSurface }]}>{vm.dog.name}</Text>
        {vm.meta ? (
          <Text style={[styles.dogMeta, { color: theme.onSurfaceVariant }]}>{vm.meta}</Text>
        ) : null}
      </View>

      {vm.dog.walkStats ? (
        <View style={styles.statsSection}>
          <DogStatsCard stats={vm.dog.walkStats} streakDays={vm.streakDays} />
        </View>
      ) : null}

      <View style={styles.walksSection}>
        <DogWalksList walks={vm.dogWalks} onPressWalk={vm.handleOpenWalk} />
      </View>

      <GroupedCard style={styles.group}>
        {vm.memberCount > 0 ? (
          <GroupedRow
            label={t('dogs.detail.members')}
            value={t('dogs.detail.membersCount', { count: vm.memberCount })}
            onPress={vm.handleOpenMembers}
          />
        ) : null}
        <GroupedRow
          label={t('dogs.detail.friends', 'Friends')}
          value={t('dogs.detail.viewFriendsList', 'View encounter history')}
          separator={false}
          onPress={vm.handleOpenFriends}
        />
      </GroupedCard>

      {vm.isOwner ? (
        <View style={styles.actions}>
          <Button
            label={t('dogs.detail.delete')}
            variant="destructive"
            onPress={vm.openDeleteConfirm}
            style={styles.actionButton}
          />
        </View>
      ) : null}

      {vm.isOwner ? (
        <ConfirmDialog
          visible={vm.showDeleteConfirm}
          title={t('dogs.detail.deleteTitle')}
          message={t('dogs.detail.deleteConfirm', { name: vm.dog.name })}
          confirmLabel={t('dogs.detail.delete')}
          onConfirm={vm.handleDelete}
          onCancel={vm.closeDeleteConfirm}
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
