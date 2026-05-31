import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, Marker, type Region } from 'react-native-maps';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { MAP_EVENT_EMOJIS } from '@/lib/walk/events';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';
import { spacing, typography } from '@/theme/tokens';

interface WalkMapProps {
  mode?: 'preview' | 'recording';
}

const WALK_MAP_FOCUSED_DELTA = 0.005;
const WALK_MAP_FALLBACK_DELTA = 0.01;

interface MapCoordinate {
  latitude: number;
  longitude: number;
}

function coordinateToRegion(coordinate: MapCoordinate, delta: number): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function usePreviewCurrentLocationRegion(enabled: boolean): Region | undefined {
  const [region, setRegion] = useState<Region>();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isActive = true;

    async function resolveCurrentLocationRegion() {
      const foreground = await Location.getForegroundPermissionsAsync();
      const permission =
        foreground.status === 'granted'
          ? foreground
          : await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') return;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!isActive) return;

      setRegion(
        coordinateToRegion(
          {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          },
          WALK_MAP_FOCUSED_DELTA,
        ),
      );
    }

    void resolveCurrentLocationRegion().catch((error) => {
      console.error('[walk.map.currentLocation] failed', error);
    });

    return () => {
      isActive = false;
    };
  }, [enabled]);

  return region;
}

// 散歩マップは GPS 軌跡と記録イベントを store から読み、地図表示の単一の情報源にします。
export function WalkMap({ mode = 'recording' }: WalkMapProps) {
  const theme = useColors();
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const showsRecordedData = mode === 'recording';
  const currentLocationRegion = usePreviewCurrentLocationRegion(mode === 'preview');

  // 地図ライブラリ用の座標形式へ変換し、記録中は最後の地点をルート表示の基準にします。
  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const lastPoint = coordinates[coordinates.length - 1];
  const initialRegion = lastPoint
    ? coordinateToRegion(lastPoint, WALK_MAP_FOCUSED_DELTA)
    : coordinateToRegion(TOKYO_STATION_COORDINATE, WALK_MAP_FALLBACK_DELTA);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation
        region={mode === 'preview' ? currentLocationRegion : undefined}
        // GPS の現在地取得前にも地図自体を描画できるよう、記録点がなければ東京駅を初期領域にします。
        initialRegion={currentLocationRegion ?? initialRegion}
      >
        {showsRecordedData && coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={theme.interactive}
            strokeWidth={4}
          />
        ) : null}
        {showsRecordedData && lastPoint ? <Marker coordinate={lastPoint} /> : null}
        {/* 座標を持つイベントだけをマーカー化し、記録操作と地図表示を同期させます。 */}
        {showsRecordedData
          ? events
              .filter((e) => e.lat != null && e.lng != null)
              .map((e) => (
                <Marker
                  key={e.id}
                  testID={`event-marker-${e.id}`}
                  coordinate={{ latitude: e.lat!, longitude: e.lng! }}
                  accessibilityLabel={`${MAP_EVENT_EMOJIS[e.eventType]} event at ${e.occurredAt}`}
                >
                  <Text style={styles.eventMarker}>{MAP_EVENT_EMOJIS[e.eventType]}</Text>
                </Marker>
              ))
          : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
  eventMarker: { fontSize: typography.title2.fontSize - spacing.xs / 2 },
});
