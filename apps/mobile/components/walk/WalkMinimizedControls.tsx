import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { useWalkElapsed } from '@/hooks/use-walk-elapsed';
import { useSettingsStore } from '@/stores/settings-store';
import { useWalkStore } from '@/stores/walk-store';
import { components, elevation, radius, spacing, typography } from '@/theme/tokens';
import { formatDistance, formatTime } from '@/lib/walk/format';
import type { Dog } from '@/types/graphql';

interface WalkMinimizedControlsProps {
  dogs: Dog[];
  onExpand: () => void;
}

// 記録中パネルを畳んだ状態で、経過時間と距離を確認しながら再展開できます。
export function WalkMinimizedControls({ dogs, onExpand }: WalkMinimizedControlsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const units = useSettingsStore((s) => s.units);
  const elapsedSec = useWalkElapsed({ startedAt });

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.recording.expand')}
        accessibilityHint={t('walk.recording.expandHint')}
        onPress={onExpand}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: theme.surface, borderColor: theme.border },
          elevation.mid,
          pressed && styles.pillPressed,
        ]}
      >
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
        <Text style={[styles.time, { color: theme.onSurface }]}>
          {formatTime(elapsedSec)}
        </Text>
        <Text style={[styles.distance, { color: theme.onSurfaceVariant }]}>
          {` · ${formatDistance(totalDistanceM, units)}`}
        </Text>
        <View style={styles.tagWrap}>
          <Tag label="LIVE" tone="live" />
        </View>
        <View style={[styles.chevronButton, { backgroundColor: theme.surfaceContainer }]}>
          <IconSymbol
            name="chevron.up"
            size={components.walkMinimized.iconSize}
            color={theme.onSurface}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: components.walkMinimized.pillPaddingV,
    paddingLeft: components.walkMinimized.pillPaddingLeft,
    paddingRight: components.walkMinimized.pillPaddingRight,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: components.walkMinimized.pillGap,
    width: '100%',
  },
  pillPressed: { opacity: 0.85 },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: components.walkMinimized.avatarSize,
    height: components.walkMinimized.avatarSize,
    borderRadius: components.walkMinimized.avatarSize / 2,
    borderWidth: components.walkMinimized.avatarBorderWidth,
  },
  avatarOverlap: { marginLeft: components.walkMinimized.avatarOverlap },
  time: {
    ...typography.title2,
    fontWeight: typography.largeTitle.fontWeight,
    fontVariant: ['tabular-nums'],
  },
  distance: {
    ...typography.caption,
    fontVariant: ['tabular-nums'],
  },
  tagWrap: { flex: 1, alignItems: 'flex-end' },
  chevronButton: {
    width: components.walkMinimized.iconButtonSize,
    height: components.walkMinimized.iconButtonSize,
    borderRadius: components.walkMinimized.iconButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});
