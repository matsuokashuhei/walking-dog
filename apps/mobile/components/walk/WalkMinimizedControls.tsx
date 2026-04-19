import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { useSettingsStore } from '@/stores/settings-store';
import { useWalkStore } from '@/stores/walk-store';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
import { formatDistance, formatTime } from '@/lib/walk/format';
import type { Dog } from '@/types/graphql';

interface WalkMinimizedControlsProps {
  dogs: Dog[];
}

const AVATAR = 28;

export function WalkMinimizedControls({ dogs }: WalkMinimizedControlsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const setMinimized = useWalkStore((s) => s.setMinimized);
  const units = useSettingsStore((s) => s.units);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      setElapsedSec(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const expand = () => setMinimized(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.recording.expand')}
        onPress={expand}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: theme.surface, borderColor: theme.border },
          elevation.low,
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
          <Text style={[styles.chevron, { color: theme.onSurface }]}>⌃</Text>
        </View>
      </Pressable>
      <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
        {t('walk.recording.expandHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    minWidth: '70%',
  },
  pillPressed: { opacity: 0.85 },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
  },
  avatarOverlap: { marginLeft: -10 },
  time: {
    ...typography.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  distance: {
    ...typography.caption,
    fontVariant: ['tabular-nums'],
  },
  tagWrap: { marginLeft: 'auto' },
  chevronButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
