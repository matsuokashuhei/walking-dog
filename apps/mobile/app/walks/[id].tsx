import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalk } from '@/hooks/use-walks';
import { useWalkDetailViewModel } from '@/hooks/use-walk-detail-view-model';
import { WalkEventTimeline } from '@/components/walk/WalkEventTimeline';
import { EVENT_EMOJIS } from '@/lib/walk/event-emojis';

export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useColors();
  const { data: walk, isLoading } = useWalk(id ?? '');
  const vm = useWalkDetailViewModel(walk);

  if (isLoading || !walk || !vm) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const separator = t('walk.detail.timeSeparator');
  const timeLabel = vm.endTime
    ? `${t('walk.detail.startTime')} ${vm.startTime}${separator}${t('walk.detail.endTime')} ${vm.endTime}`
    : `${t('walk.detail.startTime')} ${vm.startTime}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.mapContainer, { borderColor: theme.border + '33' }]}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: vm.midpoint.latitude,
              longitude: vm.midpoint.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {vm.coordinates.length >= 2 ? (
              <Polyline coordinates={vm.coordinates} strokeColor={theme.interactive} strokeWidth={4} />
            ) : null}
            {vm.events
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
          <Text style={[styles.heroTitle, { color: theme.onSurface }]}>{t('walk.detail.title')}</Text>
          <Text style={[styles.date, { color: theme.onSurface }]}>{vm.date}</Text>
          <Text style={[styles.dogs, { color: theme.onSurfaceVariant }]}>{vm.dogNames}</Text>
          <Text
            testID="walk-time"
            style={[styles.time, { color: theme.onSurfaceVariant }]}
            accessibilityLabel={timeLabel}
          >
            {vm.startTime}
            {vm.endTime ? `${separator}${vm.endTime}` : null}
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
                { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border + '33' },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.onSurface }]}>
                {t('walk.history.minutes', { count: vm.durationMin })}
              </Text>
              <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
                {t('walk.recording.time')}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border + '33' },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.onSurface }]}>
                {t('walk.history.km', { value: vm.distanceKm })}
              </Text>
              <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
                {t('walk.recording.distance')}
              </Text>
            </View>
          </View>
        </View>

        {vm.events.length > 0 ? <WalkEventTimeline events={vm.events} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapContainer: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden', margin: spacing.lg },
  map: { height: 280 },
  info: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -0.64, marginBottom: spacing.sm },
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
