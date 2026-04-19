import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import {
  countWalkEvents,
  formatDistance,
  formatPaceString,
  formatTime,
  formatWalkDateLabel,
} from '@/lib/walk/format';
import type { Walk } from '@/types/graphql';

interface DogWalkRowProps {
  walk: Walk;
  onPress?: (id: string) => void;
  separator?: boolean;
}

export function DogWalkRow({ walk, onPress, separator = true }: DogWalkRowProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const distanceM = walk.distanceM ?? 0;
  const durationSec = walk.durationSec ?? 0;
  const dateLabel = formatWalkDateLabel(walk.startedAt, new Date(), {
    today: t('walk.date.today'),
    yesterday: t('walk.date.yesterday'),
  });
  const metaParts = [
    formatDistance(distanceM),
    formatTime(durationSec),
    formatPaceString(durationSec, distanceM),
  ];
  const meta = metaParts.join(' · ');
  const { pee, poo } = countWalkEvents(walk.events);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dateLabel} · ${meta}`}
        onPress={() => onPress?.(walk.id)}
        style={styles.row}
      >
        <View style={[styles.iconTile, { backgroundColor: theme.surfaceContainer }]}>
          <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
            <Path
              d="M3 14 L7 9 L10 12 L15 5"
              stroke={theme.interactive}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={15} cy={5} r={1.5} fill={theme.interactive} />
          </Svg>
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.onSurface }]} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Text
            style={[styles.meta, { color: theme.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        </View>
        {pee + poo > 0 ? (
          <View style={styles.eventCounts}>
            {pee > 0 ? (
              <Text style={[styles.eventText, { color: theme.onSurfaceVariant }]}>
                💧{pee}
              </Text>
            ) : null}
            {poo > 0 ? (
              <Text style={[styles.eventText, { color: theme.onSurfaceVariant }]}>
                💩{poo}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={[styles.chevron, { color: theme.textDisabled }]}>›</Text>
      </Pressable>
      {separator ? (
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 44,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.subheadline,
    fontWeight: '500',
    fontSize: 15,
  },
  meta: {
    ...typography.footnote,
    fontSize: 12,
  },
  eventCounts: {
    flexDirection: 'row',
    gap: 4,
  },
  eventText: {
    fontSize: 11,
  },
  chevron: {
    fontSize: 20,
    marginLeft: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
});
