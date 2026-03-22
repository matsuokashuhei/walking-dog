import { Platform } from 'react-native';

export interface GpsPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

type OnPointCallback = (point: GpsPoint) => void;

// expo-location is loaded lazily to avoid web bundler issues
let Location: typeof import('expo-location') | null = null;
let subscription: { remove: () => void } | null = null;

async function getLocation() {
  if (!Location) {
    if (Platform.OS === 'web') {
      throw new Error('GPS tracking is not supported on web');
    }
    Location = await import('expo-location');
  }
  return Location;
}

export async function requestPermission(): Promise<boolean> {
  const loc = await getLocation();
  const { status } = await loc.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function startTracking(onPoint: OnPointCallback): Promise<void> {
  if (subscription) return;

  const loc = await getLocation();
  const granted = await requestPermission();
  if (!granted) {
    throw new Error('Location permission not granted');
  }

  subscription = await loc.watchPositionAsync(
    {
      accuracy: loc.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 3,
    },
    (location) => {
      const point: GpsPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        recordedAt: new Date(location.timestamp).toISOString(),
      };
      onPoint(point);
    },
  );
}

export function stopTracking(): void {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}

export function isTracking(): boolean {
  return subscription !== null;
}
