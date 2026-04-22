import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { spacing, typography } from '@/theme/tokens';
import type { Dog, WalkEventType } from '@/types/graphql';

const EVENT_ORDER: { type: WalkEventType; emoji: string }[] = [
  { type: 'pee', emoji: '💧' },
  { type: 'poo', emoji: '💩' },
  { type: 'photo', emoji: '📷' },
];

const ICON_SIZE = 36;

interface DogEventActionRowProps {
  dog: Dog;
  counts: { pee: number; poo: number };
  disabled: boolean;
  borderTopColor?: string;
  surfaceColor: string;
  pressedSurfaceColor: string;
  textColor: string;
  secondaryTextColor: string;
  eventLabels: Record<WalkEventType, string>;
  onPress: (type: WalkEventType, dogId: string) => void;
}

export function DogEventActionRow({
  dog,
  counts,
  disabled,
  borderTopColor,
  surfaceColor,
  pressedSurfaceColor,
  textColor,
  secondaryTextColor,
  eventLabels,
  onPress,
}: DogEventActionRowProps) {
  return (
    <View
      style={[
        styles.row,
        borderTopColor
          ? {
              borderTopColor,
              borderTopWidth: StyleSheet.hairlineWidth,
            }
          : null,
      ]}
    >
      <Image
        source={dog.photoUrl ?? require('@/assets/images/icon.png')}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.textContainer}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {dog.name}
        </Text>
        <Text style={[styles.counts, { color: secondaryTextColor }]}>
          {`💧 ${counts.pee} · 💩 ${counts.poo}`}
        </Text>
      </View>
      <View style={styles.buttons}>
        {EVENT_ORDER.map(({ type, emoji }) => (
          <Pressable
            key={type}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${dog.name} ${eventLabels[type]}`}
            accessibilityState={{ disabled }}
            onPress={() => onPress(type, dog.id)}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: pressed ? pressedSurfaceColor : surfaceColor,
              },
              disabled && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  counts: {
    ...typography.caption,
    marginTop: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 16 },
  buttonDisabled: { opacity: 0.4 },
});
