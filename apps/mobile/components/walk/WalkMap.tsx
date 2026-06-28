import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { runDetached } from '@/lib/run-detached';
import { MAP_EVENT_EMOJIS } from '@/lib/walk/events';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface WalkMapProps {
  mode?: 'preview' | 'recording';
  dogs?: Dog[];
}

interface MapCoordinate {
  latitude: number;
  longitude: number;
}

const CURRENT_LOCATION_MARKER_SCALE = 0.5;
const CURRENT_LOCATION_MARKER_SIZE = spacing.step60 * CURRENT_LOCATION_MARKER_SCALE;
const CURRENT_LOCATION_AVATAR_SIZE = spacing.step44 * CURRENT_LOCATION_MARKER_SCALE;
const CURRENT_LOCATION_AVATAR_OVERLAP =
  -(spacing.step10 + spacing.xs / 2) * CURRENT_LOCATION_MARKER_SCALE;
const CURRENT_LOCATION_BORDER_WIDTH = (spacing.xs / 2) * CURRENT_LOCATION_MARKER_SCALE;
const FOLLOW_REGION_DELTA = 0.005;
const WALK_MAP_FALLBACK_DELTA = 0.01;
const FOLLOW_ANIMATION_MS = 500;

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
          FOLLOW_REGION_DELTA,
        ),
      );
    }

    runDetached(resolveCurrentLocationRegion(), 'walk.map.currentLocation');

    return () => {
      isActive = false;
    };
  }, [enabled]);

  return region;
}

// 散歩マップは GPS 軌跡と記録イベントを store から読み、地図表示の単一の情報源にします。
export function WalkMap({ mode = 'recording', dogs = [] }: WalkMapProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const mapRef = useRef<MapView | null>(null);
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const isRecording = mode === 'recording';
  const currentLocationRegion = usePreviewCurrentLocationRegion(mode === 'preview');

  // 地図ライブラリ用の座標形式へ変換し、記録中は最後の地点を現在地表示の基準にします。
  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const lastPoint = coordinates[coordinates.length - 1];
  const lastLatitude = lastPoint?.latitude;
  const lastLongitude = lastPoint?.longitude;
  const initialRegion = lastPoint
    ? coordinateToRegion(lastPoint, FOLLOW_REGION_DELTA)
    : coordinateToRegion(TOKYO_STATION_COORDINATE, WALK_MAP_FALLBACK_DELTA);

  useEffect(() => {
    if (!isRecording || lastLatitude == null || lastLongitude == null) return;

    mapRef.current?.animateToRegion(
      {
        latitude: lastLatitude,
        longitude: lastLongitude,
        latitudeDelta: FOLLOW_REGION_DELTA,
        longitudeDelta: FOLLOW_REGION_DELTA,
      },
      FOLLOW_ANIMATION_MS,
    );
  }, [isRecording, lastLatitude, lastLongitude]);

  const showCurrentLocationMarker = isRecording && lastPoint && dogs.length > 0;
  const usesNativeUserLocation = mode === 'preview';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={usesNativeUserLocation}
        followsUserLocation={usesNativeUserLocation}
        region={mode === 'preview' ? currentLocationRegion : undefined}
        // GPS の現在地取得前にも地図自体を描画できるよう、記録点がなければ東京駅を初期領域にします。
        initialRegion={currentLocationRegion ?? initialRegion}
      >
        {isRecording && coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={theme.interactive}
            strokeWidth={4}
          />
        ) : null}
        {showCurrentLocationMarker ? (
          <Marker
            testID="current-location-marker"
            coordinate={lastPoint}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <CurrentLocationMarker
              dogs={dogs}
              accessibilityLabel={t('walk.map.currentLocation', {
                latitude: lastPoint.latitude,
                longitude: lastPoint.longitude,
              })}
            />
          </Marker>
        ) : null}
        {/* 座標を持つイベントだけをマーカー化し、記録操作と地図表示を同期させます。 */}
        {isRecording
          ? events
              .filter((e) => e.lat != null && e.lng != null)
              .map((e) => (
                <Marker
                  key={e.id}
                  testID={`event-marker-${e.id}`}
                  coordinate={{ latitude: e.lat!, longitude: e.lng! }}
                  accessibilityLabel={t('walk.map.eventAt', {
                    emoji: MAP_EVENT_EMOJIS[e.eventType],
                    occurredAt: e.occurredAt,
                  })}
                >
                  <Text style={styles.eventMarker}>{MAP_EVENT_EMOJIS[e.eventType]}</Text>
                </Marker>
              ))
          : null}
      </MapView>
    </View>
  );
}

interface CurrentLocationMarkerProps {
  dogs: Dog[];
  accessibilityLabel: string;
}

function CurrentLocationMarker({ dogs, accessibilityLabel }: CurrentLocationMarkerProps) {
  const theme = useColors();
  const visibleDogs = dogs.slice(0, 2);

  return (
    <View
      style={styles.currentLocationMarker}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.currentLocationHalo,
          { backgroundColor: theme.success, borderColor: theme.success },
        ]}
      />
      <View style={styles.currentLocationAvatars}>
        {visibleDogs.map((dog, index) => (
          <Image
            key={dog.id}
            testID={`current-location-avatar-${dog.id}`}
            source={dog.photoUrl ?? require('@/assets/images/icon.png')}
            style={[
              styles.currentLocationAvatar,
              { borderColor: theme.surface },
              index > 0 && styles.currentLocationAvatarOverlap,
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
  currentLocationMarker: {
    width: CURRENT_LOCATION_MARKER_SIZE,
    height: CURRENT_LOCATION_MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationHalo: {
    position: 'absolute',
    width: CURRENT_LOCATION_MARKER_SIZE,
    height: CURRENT_LOCATION_MARKER_SIZE,
    borderRadius: radius.full,
    borderWidth: CURRENT_LOCATION_BORDER_WIDTH,
    opacity: 0.18,
  },
  currentLocationAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationAvatar: {
    width: CURRENT_LOCATION_AVATAR_SIZE,
    height: CURRENT_LOCATION_AVATAR_SIZE,
    borderRadius: radius.full,
    borderWidth: CURRENT_LOCATION_BORDER_WIDTH,
  },
  currentLocationAvatarOverlap: {
    marginLeft: CURRENT_LOCATION_AVATAR_OVERLAP,
  },
  eventMarker: { fontSize: typography.title2.fontSize - spacing.xs / 2 },
});
