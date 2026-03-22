import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { WalkPoint } from '@/types/graphql';

interface WalkDetailMapProps {
  points: WalkPoint[];
}

/**
 * Walk detail map — shows start/end coordinates and point count.
 * TODO: Replace with react-native-maps when dev build is available.
 * react-native-maps requires a native build (not Expo Go / web).
 */
export function WalkDetailMap({ points }: WalkDetailMapProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No GPS data recorded
        </Text>
      </View>
    );
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        Route ({points.length} points)
      </Text>
      <Text style={[styles.coordText, { color: colors.text }]}>
        Start: {startPoint.lat.toFixed(4)}, {startPoint.lng.toFixed(4)}
      </Text>
      <Text style={[styles.coordText, { color: colors.text }]}>
        End: {endPoint.lat.toFixed(4)}, {endPoint.lng.toFixed(4)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  empty: {
    height: 150,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
  },
  title: {
    ...typography.bodyMedium,
  },
  coordText: {
    ...typography.caption,
    fontVariant: ['tabular-nums'],
  },
});
