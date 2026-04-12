import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalk } from '@/hooks/use-walks';
import { formatClockTime } from '@/lib/walk/format';
import { WalkEventTimeline } from '@/components/walk/WalkEventTimeline';
import type { WalkEventType } from '@/types/graphql';

const EVENT_EMOJIS: Record<WalkEventType, string> = {
  pee: '🚽',
  poo: '💩',
  photo: '📷',
};

export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useColors();
  const { data: walk, isLoading } = useWalk(id ?? '');

  if (isLoading || !walk) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const coordinates = (walk.points ?? []).map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const events = walk.events ?? [];
  const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
  const distanceKm = walk.distanceM ? (walk.distanceM / 1000).toFixed(2) : '0';
  const date = new Date(walk.startedAt).toLocaleDateString();
  const dogNames = walk.dogs.map((d) => d.name).join(', ');
  const startTime = formatClockTime(walk.startedAt);
  const endTime = walk.endedAt ? formatClockTime(walk.endedAt) : null;
  const separator = t('walk.detail.timeSeparator');
  const timeLabel = endTime
    ? `${t('walk.detail.startTime')} ${startTime}${separator}${t('walk.detail.endTime')} ${endTime}`
    : `${t('walk.detail.startTime')} ${startTime}`;

  const midpoint = coordinates.length > 0
    ? coordinates[Math.floor(coordinates.length / 2)]
    : { latitude: 35.6812, longitude: 139.7671 };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.mapContainer, { borderColor: theme.border + '33' }]}>
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
            <Polyline coordinates={coordinates} strokeColor={theme.interactive} strokeWidth={4} />
          ) : null}
          {events
            .filter((e) => e.lat != null && e.lng != null)
            .map((e) => (
              <Marker
                key={e.id}
                coordinate={{ latitude: e.lat!, longitude: e.lng! }}
                accessibilityLabel={`${EVENT_EMOJIS[e.eventType]} event`}
              >
                <Text style={styles.eventMarker}>{EVENT_EMOJIS[e.eventType]}</Text>
              </Marker>
            ))}
        </MapView>
      </View>

      <View style={styles.info}>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('walk.detail.title')}
        </Text>

        <Text style={[styles.date, { color: theme.onSurface }]}>{date}</Text>
        <Text style={[styles.dogs, { color: theme.onSurfaceVariant }]}>{dogNames}</Text>
        <Text
          testID="walk-time"
          style={[styles.time, { color: theme.onSurfaceVariant }]}
          accessibilityLabel={timeLabel}
        >
          {startTime}
          {endTime ? `${separator}${endTime}` : null}
        </Text>

        {walk.walker ? (
          <View style={styles.walkerSection}>
            <Text style={[styles.walkerLabel, { color: theme.onSurfaceVariant }]}>
              {t('walk.detail.walker')}
            </Text>
            <View style={styles.walkerRow}>
              {walk.walker.avatarUrl ? (
                <Image
                  source={{ uri: walk.walker.avatarUrl }}
                  style={styles.walkerAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={walk.walker.displayName ?? ''}
                />
              ) : (
                <View
                  style={[
                    styles.walkerAvatar,
                    styles.walkerInitialBg,
                    { backgroundColor: theme.primaryContainer },
                  ]}
                >
                  <Text style={[styles.walkerInitialText, { color: theme.onInteractive }]}>
                    {walk.walker.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <Text style={[styles.walkerName, { color: theme.onSurface }]}>
                {walk.walker.displayName}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.stats}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border + '33',
              },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.onSurface }]}>
              {t('walk.history.minutes', { count: durationMin })}
            </Text>
            <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
              {t('walk.recording.time')}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.border + '33',
              },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.onSurface }]}>
              {t('walk.history.km', { value: distanceKm })}
            </Text>
            <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
              {t('walk.recording.distance')}
            </Text>
          </View>
        </View>
      </View>

      {events.length > 0 ? <WalkEventTimeline events={events} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapContainer: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    margin: spacing.lg,
  },
  map: { height: 280 },
  info: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.64,
    marginBottom: spacing.sm,
  },
  date: { ...typography.h3 },
  dogs: { ...typography.body, marginTop: spacing.xs },
  time: { ...typography.body, marginTop: spacing.xs },
  walkerSection: { marginTop: spacing.md },
  walkerLabel: { ...typography.label, marginBottom: spacing.xs },
  walkerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walkerAvatar: { width: 32, height: 32, borderRadius: radius.full },
  walkerInitialBg: { alignItems: 'center', justifyContent: 'center' },
  walkerInitialText: { fontSize: 14, fontWeight: '600' as const },
  walkerName: { ...typography.bodyMedium },
  stats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.label, marginTop: spacing.xs },
  eventMarker: { fontSize: 20 },
});
