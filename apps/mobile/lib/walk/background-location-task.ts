import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  type ActiveWalkSessionSnapshot,
  loadActiveWalkSession,
  persistActiveWalkSession,
} from './active-walk-session';
import { buildWalkActivityProps } from './live-activity';
import { updateWalkLiveActivity } from './live-activity-controller';
import { totalHaversineDistance } from './distance';
import { useWalkStore } from '@/stores/walk-store';
import type { WalkPoint } from '@/types/graphql';

export const WALK_BACKGROUND_LOCATION_TASK = 'walking-dog-background-location';

function locationToWalkPoint(location: Location.LocationObject): WalkPoint {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    recordedAt: new Date(location.timestamp).toISOString(),
  };
}

function appendPointsToSession(
  session: ActiveWalkSessionSnapshot,
  incomingPoints: WalkPoint[],
): ActiveWalkSessionSnapshot {
  const points = [...session.points, ...incomingPoints];
  return {
    ...session,
    points,
    totalDistanceM: totalHaversineDistance(points),
  };
}

function syncRuntimeStore(session: ActiveWalkSessionSnapshot) {
  const state = useWalkStore.getState();
  if (state.phase === 'recording' && state.walkId !== session.walkId) return;
  state.hydrateRecordingSession(session);
}

export async function handleWalkBackgroundLocations(
  locations: Location.LocationObject[],
): Promise<void> {
  if (locations.length === 0) return;

  const session = await loadActiveWalkSession();
  if (!session) {
    await stopWalkBackgroundLocationUpdates();
    return;
  }

  const nextSession = appendPointsToSession(session, locations.map(locationToWalkPoint));
  await persistActiveWalkSession(nextSession);
  syncRuntimeStore(nextSession);

  await updateWalkLiveActivity(
    buildWalkActivityProps({
      walkId: nextSession.walkId,
      startedAt: new Date(nextSession.startedAt),
      distanceM: nextSession.totalDistanceM,
      dogs: nextSession.dogs,
      events: nextSession.events,
    }),
  );
}

TaskManager.defineTask(WALK_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[walk.backgroundLocation] task failed', error);
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations) return;

  await handleWalkBackgroundLocations(locations);
});

export async function startWalkBackgroundLocationUpdates(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(WALK_BACKGROUND_LOCATION_TASK);
  if (isRegistered) return;

  await Location.startLocationUpdatesAsync(WALK_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 5,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopWalkBackgroundLocationUpdates(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(WALK_BACKGROUND_LOCATION_TASK);
  if (!isRegistered) return;

  await TaskManager.unregisterTaskAsync(WALK_BACKGROUND_LOCATION_TASK);
}
