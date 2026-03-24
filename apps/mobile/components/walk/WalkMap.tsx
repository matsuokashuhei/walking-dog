import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';

interface WalkMapProps {
  followUser?: boolean;
}

export function WalkMap({ followUser = true }: WalkMapProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const points = useWalkStore((s) => s.points);

  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={followUser}
        followsUserLocation={followUser}
        initialRegion={
          lastPoint
            ? {
                latitude: lastPoint.latitude,
                longitude: lastPoint.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }
            : {
                latitude: 35.6812,
                longitude: 139.7671,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
        }
      >
        {coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        ) : null}
        {lastPoint ? <Marker coordinate={lastPoint} /> : null}
      </MapView>
      <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.9)' }]}>
        <Text style={styles.badgeText}>{t('walk.recording.recording')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  map: { flex: 1, borderRadius: radius.md },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
