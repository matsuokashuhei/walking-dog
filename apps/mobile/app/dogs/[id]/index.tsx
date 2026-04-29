import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDogDetailViewModel } from '@/hooks/use-dog-detail-view-model';
import { DogHero } from '@/components/dogs/DogHero';
import { DogHeroNavBar } from '@/components/dogs/DogHeroNavBar';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { DogWalksList } from '@/components/dogs/DogWalksList';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { GroupedRow } from '@/components/ui/GroupedRow';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

// 犬詳細画面はヒーロー表示、散歩統計、メンバー/友達導線、削除操作をまとめます。
export default function DogDetailScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useDogDetailViewModel();

  if (vm.status === 'loading') return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
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
          {/* 共有中の犬だけメンバー管理導線を出し、友達一覧は常に確認できるようにします。 */}
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
          // 削除操作は owner のみに限定し、確認ダイアログを経由して実行します。
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
      <DogHeroNavBar dogId={vm.dog.id} isOwner={vm.isOwner} />
    </View>
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
