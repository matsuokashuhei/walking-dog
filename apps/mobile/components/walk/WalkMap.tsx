import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useColors } from '@/hooks/use-colors';
import { useWalkStore } from '@/stores/walk-store';
import { MAP_EVENT_EMOJIS } from '@/lib/walk/events';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';

interface WalkMapProps {
  mapType?: 'standard' | 'hybrid';
}

/**
 * Live recording map. Reads both the GPS trail (`points`) and recorded events
 * from `walk-store` so the entire visible state comes from one source of
 * truth. Event markers update in lockstep with `WalkEventActions` writes.
 */
export function WalkMap({ mapType = 'standard' }: WalkMapProps) {
  const theme = useColors();
  const points = useWalkStore((s) => s.points);
  const routeBreakIndices = useWalkStore((s) => s.routeBreakIndices ?? []);
  const events = useWalkStore((s) => s.events);

  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const routeSegments = buildRouteSegments(coordinates, routeBreakIndices);
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapType={mapType}
        showsUserLocation
        followsUserLocation
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
        {routeSegments.flatMap((segment, index) => [
          <Polyline
            key={`highlight-${index}`}
            testID={index === 0 ? 'walk-route-highlight' : undefined}
            coordinates={segment}
            strokeColor="rgba(255,255,255,0.3)"
            strokeWidth={8}
            lineCap="round"
            lineJoin="round"
          />,
          <Polyline
            key={`route-${index}`}
            testID={index === 0 ? 'walk-route-line' : undefined}
            coordinates={segment}
            strokeColor={theme.success}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />,
        ])}
        {lastPoint ? <Marker coordinate={lastPoint} /> : null}
        {events
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
          ))}
      </MapView>
    </View>
  );
}

function buildRouteSegments(
  coordinates: { latitude: number; longitude: number }[],
  breakIndices: number[],
) {
  if (coordinates.length < 2) return [];

  const sortedBreaks = [...breakIndices].sort((a, b) => a - b);
  const segments: { latitude: number; longitude: number }[][] = [];
  let start = 0;

  for (const breakIndex of sortedBreaks) {
    const segment = coordinates.slice(start, breakIndex);
    if (segment.length >= 2) {
      segments.push(segment);
    }
    start = breakIndex;
  }

  const lastSegment = coordinates.slice(start);
  if (lastSegment.length >= 2) {
    segments.push(lastSegment);
  }

  return segments;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
  eventMarker: { fontSize: 20 },
});
