import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      <HeroNavBar dogId={vm.dog.id} />
    </View>
  );
}

function HeroNavBar({ dogId }: { dogId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[heroNavStyles.bar, { top: insets.top }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dogs.detail.back')}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Text style={heroNavStyles.back}>{`‹ ${t('dogs.detail.back')}`}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dogs.detail.edit')}
        onPress={() => router.push(`/dogs/${dogId}/edit`)}
        hitSlop={12}
      >
        <Text style={heroNavStyles.edit}>{t('dogs.detail.edit')}</Text>
      </Pressable>
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

const heroNavStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  back: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  edit: {
    fontSize: 17,
    fontWeight: '400',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
