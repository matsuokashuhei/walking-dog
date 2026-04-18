import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DogPickerCard } from '@/components/walk/DogPickerCard';
import { GroupWalkSummaryCard } from '@/components/walk/GroupWalkSummaryCard';
import { useColors } from '@/hooks/use-colors';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import { spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface WalkReadyViewProps {
  onStart: () => void;
  isStarting: boolean;
}

export function WalkReadyView({ onStart, isStarting }: WalkReadyViewProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const { data: me } = useMe();
  const dogs = useMemo<Dog[]>(() => me?.dogs ?? [], [me?.dogs]);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const selectDog = useWalkStore((s) => s.selectDog);
  const setSelectedDogs = useWalkStore((s) => s.setSelectedDogs);

  const allSelected =
    dogs.length > 0 && dogs.every((d) => selectedDogIds.includes(d.id));
  const selectedDogs = dogs.filter((d) => selectedDogIds.includes(d.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedDogs([]);
    } else {
      setSelectedDogs(dogs.map((d) => d.id));
    }
  }, [allSelected, dogs, setSelectedDogs]);

  const canStart = selectedDogIds.length > 0 && !isStarting;
  const selectAllLabel = allSelected
    ? t('walk.ready.deselectAll')
    : t('walk.ready.selectAll');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.largeTitle, { color: theme.onSurface }]}>
        {t('walk.ready.largeTitle')}
      </Text>

      <View style={styles.whosComing}>
        <SectionHeader
          label={t('walk.ready.whosComing')}
          trailing={
            dogs.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selectAllLabel}
                onPress={handleSelectAll}
                hitSlop={8}
              >
                <Text style={[styles.selectAll, { color: theme.interactive }]}>
                  {selectAllLabel}
                </Text>
              </Pressable>
            ) : null
          }
        />

        {dogs.length === 0 ? (
          <GroupedCard padding="lg">
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
              {t('walk.ready.noDogs')}
            </Text>
          </GroupedCard>
        ) : (
          <DogPickerCard
            dogs={dogs}
            selectedIds={selectedDogIds}
            onToggle={selectDog}
          />
        )}
      </View>

      {selectedDogs.length >= 2 ? (
        <View style={styles.groupCard}>
          <GroupWalkSummaryCard dogs={selectedDogs} />
        </View>
      ) : null}

      <View style={styles.ctaColumn}>
        <Button
          label={t('walk.ready.start')}
          variant="success"
          size="circle"
          onPress={onStart}
          disabled={!canStart}
          loading={isStarting}
        />
        <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
          {t('walk.ready.hint')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: spacing.xxl,
  },
  largeTitle: {
    ...typography.largeTitle,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  whosComing: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  selectAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  groupCard: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  ctaColumn: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    ...typography.footnote,
    textAlign: 'center',
    marginTop: spacing.lg,
    maxWidth: 300,
  },
});
