import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { DogPickerCard } from '@/components/walk/DogPickerCard';
import { NoDogsBody } from '@/components/walk/NoDogsBody';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkMapShell } from '@/components/walk/WalkMapShell';
import { WalkReadyStatsRow } from '@/components/walk/WalkReadyStatsRow';
import { WalkStartButton } from '@/components/walk/WalkStartButton';
import { WalkTopChip } from '@/components/walk/WalkTopChip';
import { useColors } from '@/hooks/use-colors';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import { elevation, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface WalkReadyViewProps {
  onStart: () => void;
  isStarting: boolean;
}

// 散歩開始前の画面です。犬の選択、統計、開始ボタンをマップ上の下部カードにまとめます。
export function WalkReadyView({ onStart, isStarting }: WalkReadyViewProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const { data: me } = useMe();
  const dogs = useMemo<Dog[]>(() => me?.dogs ?? [], [me?.dogs]);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const selectDog = useWalkStore((s) => s.selectDog);
  const setSelectedDogs = useWalkStore((s) => s.setSelectedDogs);

  const isSingleDog = dogs.length === 1;

  // 犬が 1 匹だけのときは選択 UI を出さないため、開始できるよう選択状態を同期します。
  useEffect(() => {
    if (isSingleDog && selectedDogIds.length === 0) {
      setSelectedDogs([dogs[0].id]);
    }
  }, [isSingleDog, dogs, selectedDogIds.length, setSelectedDogs]);

  const allSelected =
    dogs.length > 0 && dogs.every((d) => selectedDogIds.includes(d.id));

  // 複数犬の選択をまとめて切り替え、全選択済みなら解除にします。
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
  const selectedDogs = dogs.filter((dog) => selectedDogIds.includes(dog.id));

  return (
    <View style={styles.container}>
      <WalkMapShell
        map={<WalkMap mode="preview" />}
        top={<WalkTopChip dogs={selectedDogs} label={t('walk.ready.topLabelStatic')} />}
        bottom={
          <GroupedCard
            style={[
              styles.bottomCard,
              { backgroundColor: theme.material, borderColor: theme.border },
              elevation.mid,
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.textDisabled }]} />

            {/* 犬の登録状態と頭数に応じて、空状態・単体・複数選択の表示を切り替えます。 */}
            {dogs.length === 0 ? (
              <NoDogsBody />
            ) : isSingleDog ? (
              <View style={styles.bodyColumn}>
                <DogPickerCard
                  dogs={[dogs[0]]}
                  selectedIds={selectedDogIds}
                  onToggle={() => undefined}
                  variant="single"
                />
                <WalkReadyStatsRow />
                <WalkStartButton onPress={onStart} disabled={!canStart} loading={isStarting} />
              </View>
            ) : (
              <View style={styles.bodyColumn}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.onSurfaceVariant }]}>
                    {t('walk.ready.walkingWith')}
                  </Text>
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
                </View>
                <DogPickerCard
                  dogs={dogs}
                  selectedIds={selectedDogIds}
                  onToggle={selectDog}
                  variant="multi"
                />
                <WalkReadyStatsRow />
                <WalkStartButton onPress={onStart} disabled={!canStart} loading={isStarting} />
              </View>
            )}
          </GroupedCard>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomCard: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  bodyColumn: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectAll: {
    fontSize: 13,
    fontWeight: '500',
  },
});
