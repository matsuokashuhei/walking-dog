import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatDistance, formatPace, formatTime } from '@/lib/walk/format';
import type { Dog } from '@/types/graphql';

interface WalkControlsProps {
  dogs: Dog[];
  onStop: () => void;
  isStopping: boolean;
  /** Pee/Poo/Photo controls — supplied by <WalkEventActions /> from walk.tsx. */
  children?: ReactNode;
}

export function WalkControls({ dogs, onStop, isStopping, children }: WalkControlsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const setMinimized = useWalkStore((s) => s.setMinimized);

  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const frozen = isPaused && pausedAt ? pausedAt : Date.now();
      setElapsedSec(Math.floor((frozen - startedAt.getTime() - totalPausedMs) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, isPaused, pausedAt, totalPausedMs]);

  const togglePause = () => {
    if (isPaused && pausedAt !== null) {
      setTotalPausedMs((ms) => ms + (Date.now() - pausedAt));
      setPausedAt(null);
      setIsPaused(false);
    } else {
      setPausedAt(Date.now());
      setIsPaused(true);
    }
  };

  const { distanceValue, distanceUnit } = splitDistance(totalDistanceM);
  const pace = formatPace(elapsedSec, totalDistanceM);

  const isSingleDog = dogs.length === 1;
  const title = isSingleDog ? dogs[0].name : dogs.map((d) => d.name).join(' + ');
  const subtitle = isSingleDog
    ? contextualWalkLabel(startedAt, t)
    : `${t('walk.recording.groupWalk')} · ${t('walk.recording.together')}`;

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: theme.surface, borderColor: theme.border },
        elevation.mid,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.recording.minimize')}
        onPress={() => setMinimized(true)}
        hitSlop={12}
        style={styles.grabberHit}
      >
        <View style={[styles.grabber, { backgroundColor: theme.textDisabled }]} />
      </Pressable>

      <View style={styles.header}>
        <View style={styles.identity}>
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
          <View style={styles.titleCol}>
            <Text style={[styles.title, { color: theme.onSurface }]} numberOfLines={1}>
              {title}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        </View>
        <Tag label="LIVE" tone="live" />
      </View>

      <View style={styles.metrics}>
        <Metric
          label={t('walk.recording.time')}
          value={formatTime(elapsedSec)}
          color={theme.onSurface}
          sub={theme.onSurfaceVariant}
        />
        <Metric
          label={t('walk.recording.distance')}
          value={distanceValue}
          unit={distanceUnit}
          color={theme.onSurface}
          sub={theme.onSurfaceVariant}
        />
        <Metric
          label={t('walk.recording.pace')}
          value={pace.value}
          unit={pace.unit}
          color={theme.onSurface}
          sub={theme.onSurfaceVariant}
        />
      </View>

      {children ? <View style={styles.slot}>{children}</View> : null}

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isPaused ? t('walk.recording.resume') : t('walk.recording.pause')
          }
          accessibilityState={{ disabled: isStopping }}
          disabled={isStopping}
          onPress={togglePause}
          style={({ pressed }) => [
            styles.pauseButton,
            {
              backgroundColor: pressed
                ? theme.surfaceContainerHigh
                : theme.surfaceContainer,
            },
            isStopping && styles.buttonDisabled,
          ]}
        >
          <Text style={[styles.pauseEmoji, { color: theme.onSurface }]}>
            {isPaused ? '▶' : '❚❚'}
          </Text>
          <Text style={[styles.pauseLabel, { color: theme.onSurface }]}>
            {isPaused ? t('walk.recording.resume') : t('walk.recording.pause')}
          </Text>
        </Pressable>
        <View style={styles.endBtnWrap}>
          <Button
            label={t('walk.recording.endWalk')}
            variant="destructive"
            onPress={onStop}
            disabled={isStopping}
            loading={isStopping}
          />
        </View>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  unit,
  color,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  sub: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: sub }]}>{label}</Text>
      <View style={styles.metricRow}>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {unit ? <Text style={[styles.metricUnit, { color: sub }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function splitDistance(totalM: number): { distanceValue: string; distanceUnit: string } {
  const formatted = formatDistance(totalM).trim();
  const match = formatted.match(/^([\d.]+)\s*(\S+)?$/);
  return {
    distanceValue: match?.[1] ?? formatted,
    distanceUnit: match?.[2] ?? '',
  };
}

function contextualWalkLabel(startedAt: Date | null, t: (key: string) => string) {
  const hour = (startedAt ?? new Date()).getHours();
  if (hour < 12) return t('walk.recording.morningWalk');
  if (hour < 18) return t('walk.recording.afternoonWalk');
  return t('walk.recording.eveningWalk');
}

const AVATAR = 32;

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: spacing.sm + 2,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderRadius: radius.xxl + 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grabberHit: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
  },
  avatarOverlap: { marginLeft: -10 },
  titleCol: { flex: 1, minWidth: 0 },
  title: {
    ...typography.body,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 1,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metric: { flex: 1, gap: 2 },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 32,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 2,
  },
  slot: {
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: 6,
    flex: 1,
  },
  pauseEmoji: {
    fontSize: 12,
    fontWeight: '800',
  },
  pauseLabel: {
    ...typography.footnote,
    fontWeight: '600',
  },
  buttonDisabled: { opacity: 0.4 },
  endBtnWrap: {
    flex: 1.2,
  },
});
