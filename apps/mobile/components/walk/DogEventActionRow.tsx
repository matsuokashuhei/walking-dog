import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { EVENT_ORDER, UI_EVENT_EMOJIS } from '@/lib/walk/events';
import { spacing, typography } from '@/theme/tokens';
import type { Dog, WalkEventType } from '@/types/graphql';

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

// 複数犬の散歩中に、犬ごとのイベント回数と記録ボタンを 1 行にまとめます。
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
          {`${UI_EVENT_EMOJIS.pee} ${counts.pee} · ${UI_EVENT_EMOJIS.poo} ${counts.poo}`}
        </Text>
      </View>
      <View style={styles.buttons}>
        {/* イベント種別の表示順は共通定義に合わせ、画面間で操作順を揃えます。 */}
        {EVENT_ORDER.map((type) => (
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
            <Text style={styles.iconEmoji}>{UI_EVENT_EMOJIS[type]}</Text>
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
    borderRadius: ICON_SIZE / 2,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.subheadline,
    fontWeight: typography.headline.fontWeight,
  },
  counts: {
    ...typography.caption,
    marginTop: StyleSheet.hairlineWidth,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.step6,
  },
  iconButton: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: spacing.md },
  buttonDisabled: { opacity: 0.4 },
});
