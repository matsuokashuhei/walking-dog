import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogPickerCardProps {
  dogs: Dog[];
  selectedIds: string[];
  onToggle: (dogId: string) => void;
}

const AVATAR_SIZE = 44;
const SEPARATOR_INSET = AVATAR_SIZE + spacing.md + spacing.md;

export function DogPickerCard({ dogs, selectedIds, onToggle }: DogPickerCardProps) {
  const theme = useColors();

  return (
    <GroupedCard>
      {dogs.map((dog, index) => {
        const isSelected = selectedIds.includes(dog.id);
        const isLast = index === dogs.length - 1;
        return (
          <Fragment key={dog.id}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={dog.name}
              accessibilityState={{ checked: isSelected }}
              onPress={() => onToggle(dog.id)}
              style={styles.row}
            >
              <Image
                source={dog.photoUrl ?? require('@/assets/images/icon.png')}
                style={styles.avatar}
                contentFit="cover"
              />
              <View style={styles.textCol}>
                <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
                  {dog.name}
                </Text>
                {dog.breed ? (
                  <Text
                    style={[styles.breed, { color: theme.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {dog.breed}
                  </Text>
                ) : null}
              </View>
              {isSelected ? (
                <View style={[styles.check, { backgroundColor: theme.interactive }]}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.check,
                    styles.checkEmpty,
                    { borderColor: theme.textDisabled },
                  ]}
                />
              )}
            </Pressable>
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
  breed: {
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
});
