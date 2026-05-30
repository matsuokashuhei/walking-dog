import * as Location from 'expo-location';
import type { WalkPoint } from '@/types/graphql';
import {
  startWalkBackgroundLocationUpdates,
  stopWalkBackgroundLocationUpdates,
} from './background-location-task';

export async function requestPermission(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  await Location.requestBackgroundPermissionsAsync();
  return true;
}

export async function startTracking(
  onPosition: (point: WalkPoint) => void,
): Promise<() => Promise<void>> {
  let subscription: Location.LocationSubscription;
  subscription = await Location.watchPositionAsync(
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

  let backgroundTrackingStarted = false;
  try {
    await startWalkBackgroundLocationUpdates();
    backgroundTrackingStarted = true;
  } catch (error) {
    console.warn('[walk.backgroundLocation.start] unavailable', error);
  }

  return async () => {
    subscription.remove();
    if (backgroundTrackingStarted) {
      await stopWalkBackgroundLocationUpdates();
    }
  };
}
