import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { GpsPoint } from '@/lib/walk/gps-tracker';

interface WalkMapProps {
  points: GpsPoint[];
  isRecording?: boolean;
}

/**
 * Walk map component — shows GPS coordinates and point count.
 * TODO: Replace with react-native-maps when dev build is available.
 * react-native-maps requires a native build (not Expo Go / web).
 */
export function WalkMap({ points, isRecording = false }: WalkMapProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {isRecording ? '📍 GPS Recording' : '🗺️ Map'}
      </Text>
      {lastPoint ? (
        <View style={styles.coordsContainer}>
          <Text style={[styles.coordText, { color: colors.text }]}>
            {lastPoint.lat.toFixed(6)}, {lastPoint.lng.toFixed(6)}
          </Text>
          <Text style={[styles.pointCount, { color: colors.textSecondary }]}>
            {points.length} points
          </Text>
        </View>
      ) : (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Waiting for GPS...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 200,
  },
  title: {
    ...typography.bodyMedium,
  },
  hint: {
    ...typography.caption,
  },
  coordsContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  coordText: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pointCount: {
    ...typography.caption,
  },
});
