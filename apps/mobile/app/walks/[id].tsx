import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import { useWalk } from '@/hooks/use-walks';
import { useWalkDetailViewModel } from '@/hooks/use-walk-detail-view-model';
import { WalkEventTimeline } from '@/components/walk/WalkEventTimeline';
import { MAP_EVENT_EMOJIS } from '@/lib/walk/events';

// 散歩詳細画面は保存済み散歩のルート、メトリクス、担当者、イベント履歴を表示します。
export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useColors();
  const { data: walk, isLoading } = useWalk(id ?? '');
  const vm = useWalkDetailViewModel(walk);

  if (isLoading || !walk || !vm) {
    // 詳細データまたは表示用モデルが揃うまでは、地図を描画せずローディングに留めます。
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const separator = t('walk.detail.timeSeparator');
  // スクリーンリーダー向けには開始・終了の文脈を含めた時刻ラベルを組み立てます。
  const timeLabel = vm.endTime
    ? `${t('walk.detail.startTime')} ${vm.startTime}${separator}${t('walk.detail.endTime')} ${vm.endTime}`
    : `${t('walk.detail.startTime')} ${vm.startTime}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GroupedCard style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: vm.midpoint.latitude,
              longitude: vm.midpoint.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {/* GPS 点が 2 点以上ある場合だけルート線を描き、単一点の誤表示を避けます。 */}
            {vm.coordinates.length >= 2 ? (
              <Polyline
                coordinates={vm.coordinates}
                strokeColor={theme.success}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}
            {vm.events
              .filter((e) => e.lat != null && e.lng != null)
              .map((e) => (
                // 座標を持つイベントだけを、種別ごとの絵文字マーカーとして地図に重ねます。
                <Marker
                  key={e.id}
                  coordinate={{ latitude: e.lat!, longitude: e.lng! }}
                  accessibilityLabel={`${MAP_EVENT_EMOJIS[e.eventType]} event`}
                >
                  <Text style={styles.eventMarker}>{MAP_EVENT_EMOJIS[e.eventType]}</Text>
                </Marker>
              ))}
          </MapView>
        </GroupedCard>

        <View style={styles.hero}>
          <Text style={[styles.caption, { color: theme.onSurfaceVariant }]}>
            {vm.date.toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: theme.onSurface }]}>
            {t('walk.detail.title')}
          </Text>
          <Text style={[styles.dogs, { color: theme.onSurfaceVariant }]}>{vm.dogNames}</Text>
          <Text
            testID="walk-time"
            style={[styles.time, { color: theme.onSurfaceVariant }]}
            accessibilityLabel={timeLabel}
          >
            {vm.startTime}
            {vm.endTime ? `${separator}${vm.endTime}` : null}
          </Text>
        </View>

        <GroupedCard padding="lg" style={styles.metrics}>
          <Metric
            label={t('walk.recording.distance')}
            value={vm.distanceDisplay.value}
            unit={vm.distanceDisplay.unit}
            labelColor={theme.onSurfaceVariant}
            valueColor={theme.onSurface}
          />
          <Metric
            label={t('walk.recording.time')}
            value={vm.durationDisplay}
            labelColor={theme.onSurfaceVariant}
            valueColor={theme.onSurface}
          />
          <Metric
            label="Pace"
            value={vm.paceDisplay.value}
            unit={vm.paceDisplay.unit}
            labelColor={theme.onSurfaceVariant}
            valueColor={theme.onSurface}
          />
        </GroupedCard>

        {vm.walker ? (
          // 担当者情報がある散歩だけ、アバターまたはイニシャル付きで表示します。
          <View style={styles.walkerSection}>
            <Text style={[styles.walkerLabel, { color: theme.onSurfaceVariant }]}>
              {t('walk.detail.walker')}
            </Text>
            <View style={styles.walkerRow}>
              {vm.walker.avatarUrl ? (
                <Image
                  source={{ uri: vm.walker.avatarUrl }}
                  style={styles.walkerAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={vm.walker.displayName ?? ''}
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
                    {vm.walker.initial}
                  </Text>
                </View>
              )}
              <Text style={[styles.walkerName, { color: theme.onSurface }]}>
                {vm.walker.displayName}
              </Text>
            </View>
          </View>
        ) : null}

        {vm.events.length > 0 ? (
          // 記録イベントがある場合だけ、詳細タイムラインを追加します。
          <GroupedCard style={styles.timelineCard}>
            <WalkEventTimeline events={vm.events} />
          </GroupedCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

// メトリクスセルは距離・時間・ペースで同じ見た目を共有します。
function Metric({
  label,
  value,
  unit,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  unit?: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.metricRow}>
        <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
        {unit ? <Text style={[styles.metricUnit, { color: labelColor }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  mapCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  map: { height: 260, borderRadius: radius.xl },

  hero: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  caption: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  dogs: { ...typography.subheadline, marginTop: spacing.xs },
  time: { ...typography.footnote, marginTop: 2 },

  metrics: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metric: { flex: 1, gap: 4 },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricRow: { flexDirection: 'row', alignItems: 'baseline' },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    lineHeight: 30,
  },
  metricUnit: { fontSize: 12, fontWeight: '500', marginLeft: 2 },

  walkerSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  walkerLabel: { ...typography.label, marginBottom: spacing.xs },
  walkerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walkerAvatar: { width: 32, height: 32, borderRadius: radius.full },
  walkerInitialBg: { alignItems: 'center', justifyContent: 'center' },
  walkerInitialText: { fontSize: 14, fontWeight: '600' as const },
  walkerName: { ...typography.bodyMedium },

  timelineCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },

  eventMarker: { fontSize: 20 },
});
