import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface WalkTopChipProps {
  dogs: Dog[];
  label?: string;
}

const AVATAR = 22;

// マップ上部に、散歩対象の犬または固定ラベルを小さなチップとして表示します。
export function WalkTopChip({ dogs, label }: WalkTopChipProps) {
  const { t } = useTranslation();
  const theme = useColors();

  // 表示する犬も固定ラベルもない場合は、上部チップ自体を出しません。
  if (dogs.length === 0 && !label) return null;

  const isSingle = dogs.length === 1;
  // 親から明示ラベルが渡された場合は、犬の頭数よりもその文言を優先します。
  const displayLabel =
    label ??
    (isSingle
      ? t('walk.recording.walkWith', { name: dogs[0].name })
      : t('walk.recording.groupWalk'));

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: theme.surface, borderColor: theme.border },
        elevation.low,
      ]}
    >
      {isSingle || dogs.length === 0 ? null : (
        <View style={styles.avatars}>
          {dogs.slice(0, 2).map((dog, i) => (
            <Image
              key={dog.id}
              source={dog.photoUrl ?? require('@/assets/images/icon.png')}
              style={[
                styles.avatar,
                { borderColor: theme.surface },
                i > 0 && styles.avatarOverlap,
              ]}
              contentFit="cover"
            />
          ))}
        </View>
      )}
      <Text style={[styles.label, { color: theme.onSurface }]} numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.step6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    maxWidth: '80%',
  },
  avatars: {
    flexDirection: 'row',
    marginRight: spacing.xs,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  label: {
    ...typography.subheadline,
    fontWeight: typography.headline.fontWeight,
  },
});
