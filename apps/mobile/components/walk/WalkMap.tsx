import { StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { MAP_EVENT_EMOJIS } from '@/lib/walk/events';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';

/**
 * Live recording map. Reads both the GPS trail (`points`) and recorded events
 * from `walk-store` so the entire visible state comes from one source of
 * truth. Event markers update in lockstep with `WalkEventActions` writes.
 */
interface WalkMapProps {
  mode?: 'preview' | 'recording';
}

export function WalkMap({ mode = 'recording' }: WalkMapProps) {
  const theme = useColors();
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const isRecording = mode === 'recording';

  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={isRecording}
        followsUserLocation={isRecording}
        initialRegion={
          lastPoint
            ? {
                latitude: lastPoint.latitude,
                longitude: lastPoint.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }
            : {
                latitude: TOKYO_STATION_COORDINATE.latitude,
                longitude: TOKYO_STATION_COORDINATE.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
        }
      >
        {isRecording && coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={theme.interactive}
            strokeWidth={4}
          />
        ) : null}
        {isRecording && lastPoint ? <Marker coordinate={lastPoint} /> : null}
        {isRecording
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
  eventMarker: { fontSize: 20 },
});
