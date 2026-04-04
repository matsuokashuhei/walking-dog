import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useWalk } from '@/hooks/use-walks';
import { formatClockTime } from '@/lib/walk/format';

export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: walk, isLoading } = useWalk(id ?? '');

  if (isLoading || !walk) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const coordinates = (walk.points ?? []).map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
  const distanceKm = walk.distanceM ? (walk.distanceM / 1000).toFixed(2) : '0';
  const date = new Date(walk.startedAt).toLocaleDateString();
  const dogNames = walk.dogs.map((d) => d.name).join(', ');
  const startTime = formatClockTime(walk.startedAt);
  const endTime = walk.endedAt ? formatClockTime(walk.endedAt) : null;
  const timeLabel = endTime
    ? `${t('walk.detail.startTime')} ${startTime}${t('walk.detail.timeSeparator')}${t('walk.detail.endTime')} ${endTime}`
    : `${t('walk.detail.startTime')} ${startTime}`;

  const midpoint = coordinates.length > 0
    ? coordinates[Math.floor(coordinates.length / 2)]
    : { latitude: 35.6812, longitude: 139.7671 };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: midpoint.latitude,
          longitude: midpoint.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {coordinates.length >= 2 ? (
          <Polyline coordinates={coordinates} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}
      </MapView>

      <View style={styles.info}>
        <Text style={[styles.date, { color: colors.text }]}>{date}</Text>
        <Text style={[styles.dogs, { color: colors.textSecondary }]}>{dogNames}</Text>
        <Text
          testID="walk-time"
          style={[styles.time, { color: colors.textSecondary }]}
          accessibilityLabel={timeLabel}
        >
          {startTime}
          {endTime ? `${t('walk.detail.timeSeparator')}${endTime}` : null}
        </Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {t('walk.history.minutes', { count: durationMin })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.time')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {t('walk.history.km', { value: distanceKm })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.distance')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { height: 300 },
  info: { padding: spacing.lg },
  date: { ...typography.h3 },
  dogs: { ...typography.body, marginTop: spacing.xs },
  time: { ...typography.body, marginTop: spacing.xs },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
});
