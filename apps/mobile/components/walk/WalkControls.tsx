import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatDistance, formatTime } from '@/lib/walk/format';

interface WalkControlsProps {
  onStop: () => void;
  isStopping: boolean;
  /** Optional Pee/Poo/Photo row (or any compact quick-log element) to slot between the
   *  metrics and the End Walk button. Supplied by <WalkEventActions /> from walk.tsx. */
  children?: ReactNode;
}

export function WalkControls({ onStop, isStopping, children }: WalkControlsProps) {
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const { distanceValue, distanceUnit } = splitDistance(totalDistanceM);
  const pace = formatPace(elapsedSec, totalDistanceM);

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: theme.material, borderColor: theme.border },
        elevation.mid,
      ]}
    >
      <View style={[styles.grabber, { backgroundColor: theme.textDisabled }]} />

      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.onSurface }]}>Walking</Text>
        <Tag label="LIVE" tone="live" />
      </View>

      <View style={styles.metrics}>
        <Metric
          label="Time"
          value={formatTime(elapsedSec)}
          color={theme.onSurface}
          sub={theme.onSurfaceVariant}
        />
        <Metric
          label="Distance"
          value={distanceValue}
          unit={distanceUnit}
          color={theme.onSurface}
          sub={theme.onSurfaceVariant}
        />
        <Metric
          label="Pace"
          value={pace.value}
          unit={pace.unit}
          color={theme.onSurface}
          sub={theme.onSurfaceVariant}
        />
      </View>

      {children ? <View style={styles.slot}>{children}</View> : null}

      <Button
        label="End Walk"
        variant="destructive"
        onPress={onStop}
        disabled={isStopping}
        loading={isStopping}
      />
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

// Split "1.42 km" → { value: "1.42", unit: "km" } for the unit-size flourish.
function splitDistance(totalM: number): { distanceValue: string; distanceUnit: string } {
  const formatted = formatDistance(totalM).trim();
  const match = formatted.match(/^([\d.]+)\s*(\S+)?$/);
  return {
    distanceValue: match?.[1] ?? formatted,
    distanceUnit: match?.[2] ?? '',
  };
}

// Pace = elapsed time per km, formatted as mm'ss" — inert until ≥ 100 m travelled.
function formatPace(elapsedSec: number, totalM: number): { value: string; unit: string } {
  if (totalM < 100 || elapsedSec === 0) return { value: '—', unit: '/km' };
  const secPerKm = (elapsedSec / totalM) * 1000;
  const mm = Math.floor(secPerKm / 60);
  const ss = Math.floor(secPerKm % 60);
  return { value: `${mm}'${ss.toString().padStart(2, '0')}"`, unit: '/km' };
}

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: spacing.sm + 2,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderRadius: radius.xxl + 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    opacity: 0.4,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
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
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 2,
  },
  slot: {
    marginBottom: spacing.lg,
  },
});
