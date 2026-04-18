import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatDistance, formatTime } from '@/lib/walk/format';
import type { WalkEvent } from '@/types/graphql';

export function WalkSummaryCard() {
  const router = useRouter();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const events = useWalkStore((s) => s.events);
  const reset = useWalkStore((s) => s.reset);

  const elapsedSec = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
    : 0;
  const pace = formatPace(elapsedSec, totalDistanceM);
  const counts = countEvents(events);

  // "Save walk" commits the in-memory store to history and returns to the
  // Walk Ready state so the user can start a new session without being stuck
  // on this screen (regression from commit 625c688).
  const handleSave = () => {
    const id = walkId;
    reset();
    if (id) router.push(`/walks/${id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.caption, { color: theme.success }]}>WALK COMPLETE</Text>
        <Text style={[styles.title, { color: theme.onSurface }]}>Nice walk!</Text>
      </View>

      <GroupedCard padding="lg" style={styles.metrics}>
        <MetricRow
          label="Distance"
          value={formatDistance(totalDistanceM).trim()}
          dot={theme.success}
          labelColor={theme.onSurfaceVariant}
          valueColor={theme.onSurface}
        />
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <MetricRow
          label="Time"
          value={formatTime(elapsedSec)}
          dot={theme.warning}
          labelColor={theme.onSurfaceVariant}
          valueColor={theme.onSurface}
        />
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <MetricRow
          label="Pace"
          value={pace}
          dot={theme.error}
          labelColor={theme.onSurfaceVariant}
          valueColor={theme.onSurface}
        />
      </GroupedCard>

      <View style={styles.tagRow}>
        {counts.poo > 0 ? (
          <TagChip
            label={`💩 ${counts.poo}`}
            background={theme.surfaceContainer}
            color={theme.onSurface}
          />
        ) : null}
        {counts.pee > 0 ? (
          <TagChip
            label={`💧 ${counts.pee}`}
            background={theme.surfaceContainer}
            color={theme.onSurface}
          />
        ) : null}
        {counts.photo > 0 ? (
          <TagChip
            label={`📷 ${counts.photo}`}
            background={theme.surfaceContainer}
            color={theme.onSurface}
          />
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button label="Add note" variant="ghost" style={styles.addNote} />
        <Button
          label="Save walk"
          variant="primary"
          onPress={handleSave}
          style={styles.save}
        />
      </View>
    </View>
  );
}

function MetricRow({
  label,
  value,
  dot,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  dot: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={[styles.metricDot, { backgroundColor: dot }]} />
      <Text style={[styles.metricLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function TagChip({
  label,
  background,
  color,
}: {
  label: string;
  background: string;
  color: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function countEvents(events: WalkEvent[]): {
  pee: number;
  poo: number;
  photo: number;
} {
  const counts = { pee: 0, poo: 0, photo: 0 };
  for (const e of events) {
    if (e.eventType === 'pee') counts.pee += 1;
    else if (e.eventType === 'poo') counts.poo += 1;
    else if (e.eventType === 'photo') counts.photo += 1;
  }
  return counts;
}

function formatPace(elapsedSec: number, totalM: number): string {
  if (totalM < 100 || elapsedSec === 0) return "—'—\"/km";
  const secPerKm = (elapsedSec / totalM) * 1000;
  const mm = Math.floor(secPerKm / 60);
  const ss = Math.floor(secPerKm % 60);
  return `${mm}'${ss.toString().padStart(2, '0')}"/km`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginTop: spacing.xs,
  },
  metrics: {
    marginBottom: spacing.lg,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    flex: 1,
    fontSize: 13,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 100,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
  },
  addNote: {
    flex: 1,
  },
  save: {
    flex: 1.4,
  },
});
