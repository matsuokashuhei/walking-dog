import { useCallback, useEffect, useMemo } from 'react';
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
  const dogIds = useMemo(() => new Set(dogs.map((dog) => dog.id)), [dogs]);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const selectDog = useWalkStore((s) => s.selectDog);
  const setSelectedDogs = useWalkStore((s) => s.setSelectedDogs);

  const isSingleDog = dogs.length === 1;
  const selectedDogIdsInPack = useMemo(
    () => selectedDogIds.filter((dogId) => dogIds.has(dogId)),
    [dogIds, selectedDogIds],
  );
  const effectiveSelectedDogIds = useMemo(() => {
    if (isSingleDog && dogs[0]) {
      return [dogs[0].id];
    }
    return selectedDogIdsInPack;
  }, [dogs, isSingleDog, selectedDogIdsInPack]);
  const selectedDogs = useMemo(
    () => dogs.filter((dog) => effectiveSelectedDogIds.includes(dog.id)),
    [dogs, effectiveSelectedDogIds],
  );

  // With a single dog, there is no picker — keep the selection in sync so START works.
  useEffect(() => {
    if (!isSingleDog || !dogs[0]) return;

    if (selectedDogIds.length !== 1 || selectedDogIds[0] !== dogs[0].id) {
      setSelectedDogs([dogs[0].id]);
    }
  }, [dogs, isSingleDog, selectedDogIds, setSelectedDogs]);

  const allSelected =
    dogs.length > 0 && dogs.every((d) => effectiveSelectedDogIds.includes(d.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedDogs([]);
    } else {
      setSelectedDogs(dogs.map((d) => d.id));
    }
  }, [allSelected, dogs, setSelectedDogs]);

  const canStart = effectiveSelectedDogIds.length > 0 && !isStarting;
  const selectAllLabel = allSelected
    ? t('walk.ready.deselectAll')
    : t('walk.ready.selectAll');
  const showSelectAll = dogs.length >= 2;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.largeTitle, { color: theme.onSurface }]}>
        {t('walk.ready.largeTitle')}
      </Text>

      <View style={styles.dogSection}>
        <SectionHeader
          label={t('walk.ready.whosComing')}
          trailing={
            showSelectAll ? (
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
            selectedIds={effectiveSelectedDogIds}
            onToggle={selectDog}
            variant={isSingleDog ? 'single' : 'multi'}
          />
        )}

        <View style={styles.summaryCard}>
          <GroupWalkSummaryCard dogs={selectedDogs} />
        </View>
      </View>

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
  dogSection: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  selectAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
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
