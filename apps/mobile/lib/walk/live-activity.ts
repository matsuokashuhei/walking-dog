import Constants from 'expo-constants';
import { Platform } from 'react-native';

type WalkActivityModule = typeof import('@/modules/walk-activity');

function loadModule(): WalkActivityModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('../../modules/walk-activity') as WalkActivityModule;
  } catch (err) {
    console.warn('[live-activity] module not available', err);
    return null;
  }
}

const mod = loadModule();

const extras = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  appGroup?: string;
};

/**
 * Minimum elapsed time between consecutive `updateLiveActivityDistance` calls.
 * Owners (e.g. the walk session hook) compare this against
 * `walk-store.liveActivity.lastUpdateAt` to gate native updates.
 */
export const UPDATE_DEBOUNCE_MS = 10_000;

export interface LiveActivityStartInput {
  walkId: string;
  dogId?: string;
  dogName: string;
  startedAt: Date;
  distanceM: number;
}

export function isLiveActivitySupported(): boolean {
  return mod?.isSupported() ?? false;
}

/**
 * Starts an iOS Live Activity. Returns the activity id on success or null when
 * Live Activities are unsupported, config is missing, or the native call
 * throws. Callers are responsible for persisting the id (typically in the
 * walk-store) and passing it to subsequent update / end calls.
 */
export async function startLiveActivity(input: LiveActivityStartInput): Promise<string | null> {
  if (!mod || !mod.isSupported()) return null;
  if (!extras.appGroup || !extras.apiUrl) {
    console.warn('[live-activity] appGroup or apiUrl missing from expo config extras');
    return null;
  }
  try {
    return await mod.startActivity({
      walkId: input.walkId,
      dogId: input.dogId,
      dogName: input.dogName,
      startedAtMs: input.startedAt.getTime(),
      distanceM: input.distanceM,
      appGroup: extras.appGroup,
      apiUrl: extras.apiUrl,
    });
  } catch (err) {
    console.error('[live-activity] start failed', err);
    return null;
  }
}

export async function updateLiveActivityDistance(
  activityId: string,
  distanceM: number,
): Promise<void> {
  if (!mod) return;
  try {
    await mod.updateActivity(activityId, { distanceM });
  } catch (err) {
    console.error('[live-activity] update failed', err);
  }
}

export async function updateLiveActivityEvent(
  activityId: string,
  distanceM: number,
  eventKind: string,
  eventAt: Date,
): Promise<void> {
  if (!mod) return;
  try {
    await mod.updateActivity(activityId, {
      distanceM,
      lastEventKind: eventKind,
      lastEventAtMs: eventAt.getTime(),
    });
  } catch (err) {
    console.error('[live-activity] event update failed', err);
  }
}

export async function endLiveActivity(activityId: string): Promise<void> {
  if (!mod) return;
  if (!extras.appGroup) return;
  try {
    await mod.endActivity(activityId, extras.appGroup);
  } catch (err) {
    console.error('[live-activity] end failed', err);
  }
}
