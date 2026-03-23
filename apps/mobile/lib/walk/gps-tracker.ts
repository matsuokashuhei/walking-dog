import * as Location from 'expo-location';
import type { WalkPoint } from '@/types/graphql';

export async function requestPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function startTracking(
  onPosition: (point: WalkPoint) => void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
    },
    (location) => {
      onPosition({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    },
  );

  return () => subscription.remove();
}
