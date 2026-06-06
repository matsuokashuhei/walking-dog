import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DogPickerCard } from '@/components/walk/DogPickerCard';
import { NoDogsBody } from '@/components/walk/NoDogsBody';
import { WalkReadyStatsRow } from '@/components/walk/WalkReadyStatsRow';
import { WalkStartButton } from '@/components/walk/WalkStartButton';
import { useColors } from '@/hooks/use-colors';
import type { WalkReadySelection } from '@/hooks/use-walk-ready-selection';
import { components, spacing, typography } from '@/theme/tokens';

interface WalkReadySheetContentProps {
  selection: WalkReadySelection;
  onStart: () => void;
  isStarting: boolean;
}

// 開始前シートの中身だけを担当します。外枠は WalkFloatingSheet が所有します。
export function WalkReadySheetContent({
  selection,
  onStart,
  isStarting,
}: WalkReadySheetContentProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const {
    dogs,
    selectedDogs,
    validSelectedDogIds,
    isSingleDog,
    allSelected,
    selectDog,
    handleSelectAll,
  } = selection;

  const canStart = selectedDogs.length > 0 && !isStarting;
  const selectAllLabel = allSelected
    ? t('walk.ready.deselectAll')
    : t('walk.ready.selectAll');

  if (dogs.length === 0) {
    return <NoDogsBody />;
  }

  if (isSingleDog) {
    return (
      <View style={styles.bodyColumn}>
        <DogPickerCard
          dogs={[dogs[0]]}
          selectedIds={validSelectedDogIds}
          onToggle={() => undefined}
          variant="single"
        />
        <WalkReadyStatsRow />
        <WalkStartButton onPress={onStart} disabled={!canStart} loading={isStarting} />
      </View>
    );
  }

  return (
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
        selectedIds={validSelectedDogIds}
        onToggle={selectDog}
        variant="multi"
      />
      <WalkReadyStatsRow />
      <WalkStartButton onPress={onStart} disabled={!canStart} loading={isStarting} />
    </View>
  );
}

const styles = StyleSheet.create({
  bodyColumn: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.metricLabel,
  },
  selectAll: {
    ...typography.footnote,
    fontWeight: components.button.fontPrimary.fontWeight,
  },
});
