import { Fragment, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { formatLastWalk } from '@/lib/walk/lastWalk';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogPickerCardProps {
  dogs: Dog[];
  selectedIds: string[];
  onToggle: (dogId: string) => void;
  variant?: 'multi' | 'single';
}

const AVATAR_SIZE = 44;
const SEPARATOR_INSET = AVATAR_SIZE + spacing.md + spacing.md;

// 散歩前の犬選択カードです。複数選択と単体表示の差分だけをここで吸収します。
export function DogPickerCard({
  dogs,
  selectedIds,
  onToggle,
  variant = 'multi',
}: DogPickerCardProps) {
  const theme = useColors();
  // 「前回の散歩」表示がレンダー中に揺れないよう、基準時刻を固定します。
  const now = useMemo(() => new Date(), []);
  const interactive = variant === 'multi';

  return (
    <GroupedCard>
      {dogs.map((dog, index) => {
        const isSelected = selectedIds.includes(dog.id);
        const isLast = index === dogs.length - 1;

        return (
          <Fragment key={dog.id}>
            {interactive ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={dog.name}
                accessibilityState={{ checked: isSelected }}
                onPress={() => onToggle(dog.id)}
                style={styles.row}
              >
                <DogPickerRow dog={dog} isSelected={isSelected} now={now} showSelection />
              </Pressable>
            ) : (
              <View accessibilityLabel={dog.name} style={styles.row}>
                <DogPickerRow
                  dog={dog}
                  isSelected={isSelected}
                  now={now}
                  showSelection={false}
                  showChevron
                />
              </View>
            )}
            {!isLast ? (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: theme.border, marginLeft: SEPARATOR_INSET },
                ]}
              />
            ) : null}
          </Fragment>
        );
      })}
    </GroupedCard>
  );
}

interface DogPickerRowProps {
  dog: Dog;
  isSelected: boolean;
  now: Date;
  showSelection: boolean;
  showChevron?: boolean;
}

function DogPickerRow({
  dog,
  isSelected,
  now,
  showSelection,
  showChevron,
}: DogPickerRowProps) {
  const theme = useColors();
  const { t } = useTranslation();
  // 犬ごとの最新散歩日時を、現在時刻から見た相対的な文言に整えます。
  const lastWalkText = formatLastWalk(dog.latestWalk?.endedAt, now, t);

  return (
    <>
      <Image
        source={dog.photoUrl ?? require('@/assets/images/icon.png')}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.textCol}>
        <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
          {dog.name}
        </Text>
        <Text style={[styles.lastWalk, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
          {lastWalkText}
        </Text>
      </View>

      {showSelection ? <SelectionIndicator isSelected={isSelected} /> : null}
      {!showSelection && showChevron ? (
        <Text style={[styles.chevron, { color: theme.textDisabled }]}>›</Text>
      ) : null}
    </>
  );
}

function SelectionIndicator({ isSelected }: { isSelected: boolean }) {
  const theme = useColors();

  // 未選択時は空の円だけを表示し、選択済みとの差を明確にします。
  if (!isSelected) {
    return (
      <View
        style={[
          styles.check,
          styles.checkEmpty,
          { borderColor: theme.textDisabled },
        ]}
      />
    );
  }

  return (
    <View style={[styles.check, { backgroundColor: theme.interactive }]}>
      <Text style={styles.checkMark}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.step12,
    minHeight: spacing.step44 + 20,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
  },
  lastWalk: {
    ...typography.caption,
    marginTop: 2,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmpty: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    paddingLeft: spacing.xs,
  },
});
