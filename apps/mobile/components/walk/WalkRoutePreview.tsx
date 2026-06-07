import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';
import {
  formatDistance,
  formatPaceString,
  formatTime,
} from '@/lib/walk/format';
import type { WalkPoint } from '@/types/graphql';

interface WalkRoutePreviewProps {
  points: WalkPoint[];
  totalDistanceM: number;
  elapsedSec: number;
}

const MAP_HEIGHT = 180;
const DOT_SIZE = 14;

// 散歩終了後に、記録されたルートと主要メトリクスをコンパクトにプレビューします。
export function WalkRoutePreview({
  points,
  totalDistanceM,
  elapsedSec,
}: WalkRoutePreviewProps) {
  const { t } = useTranslation();
  const theme = useColors();

  // 記録点を地図座標へ変換し、ルートの始点と終点をマーカー表示に使います。
  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];

  // ルートがない場合も地図が安定して表示されるよう、東京駅をフォールバックにします。
  const region = start
    ? {
        latitude: (start.latitude + (end?.latitude ?? start.latitude)) / 2,
        longitude: (start.longitude + (end?.longitude ?? start.longitude)) / 2,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: TOKYO_STATION_COORDINATE.latitude,
        longitude: TOKYO_STATION_COORDINATE.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  return (
    <View style={[styles.card, { borderColor: theme.border }, elevation.low]}>
      <MapView
        testID="route-preview-map"
        style={styles.map}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        pointerEvents="none"
      >
        {coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={theme.success}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {start ? (
          <Marker
            testID="route-preview-start"
            coordinate={start}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityLabel={t('walk.map.routeStart')}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.success, borderColor: theme.surface },
              ]}
            />
          </Marker>
        ) : null}
        {end && coordinates.length >= 2 ? (
          <Marker
            testID="route-preview-end"
            coordinate={end}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityLabel={t('walk.map.routeEnd')}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.error, borderColor: theme.surface },
              ]}
            />
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.pillRow} pointerEvents="none">
        <Pill label={formatDistance(totalDistanceM)} theme={theme} />
        <Pill label={formatTime(elapsedSec)} theme={theme} />
        <Pill label={formatPaceString(elapsedSec, totalDistanceM)} theme={theme} />
      </View>
    </View>
  );
}

interface PillProps {
  label: string;
  theme: ReturnType<typeof useColors>;
}

// 地図上に重ねる読み取り専用のメトリクス表示です。
function Pill({ label, theme }: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        elevation.low,
      ]}
    >
      <Text style={[styles.pillLabel, { color: theme.onSurface }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: MAP_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  map: { flex: 1 },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  pillRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.step10,
    paddingVertical: spacing.xs + StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillLabel: {
    ...typography.footnote,
    fontWeight: typography.headline.fontWeight,
    fontVariant: ['tabular-nums'],
  },
});
