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

const UPDATE_DEBOUNCE_MS = 10_000;

let currentActivityId: string | null = null;
let lastUpdateAt = 0;

export interface LiveActivityStartInput {
  walkId: string;
  dogName: string;
  startedAt: Date;
  distanceM: number;
}

export function isLiveActivitySupported(): boolean {
  return mod?.isSupported() ?? false;
}

export async function startLiveActivity(input: LiveActivityStartInput): Promise<void> {
  if (!mod || !mod.isSupported()) return;
  if (currentActivityId) return;
  try {
    const id = await mod.startActivity({
      walkId: input.walkId,
      dogName: input.dogName,
      startedAtMs: input.startedAt.getTime(),
      distanceM: input.distanceM,
    });
    currentActivityId = id;
    lastUpdateAt = Date.now();
  } catch (err) {
    console.error('[live-activity] start failed', err);
  }
}

export async function updateLiveActivityDistance(distanceM: number): Promise<void> {
  if (!mod || !currentActivityId) return;
  const now = Date.now();
  if (now - lastUpdateAt < UPDATE_DEBOUNCE_MS) return;
  lastUpdateAt = now;
  try {
    await mod.updateActivity(currentActivityId, { distanceM });
  } catch (err) {
    console.error('[live-activity] update failed', err);
  }
}

export async function updateLiveActivityEvent(
  distanceM: number,
  eventKind: string,
  eventAt: Date,
): Promise<void> {
  if (!mod || !currentActivityId) return;
  lastUpdateAt = Date.now();
  try {
    await mod.updateActivity(currentActivityId, {
      distanceM,
      lastEventKind: eventKind,
      lastEventAtMs: eventAt.getTime(),
    });
  } catch (err) {
    console.error('[live-activity] event update failed', err);
  }
}

export async function endLiveActivity(): Promise<void> {
  if (!mod || !currentActivityId) return;
  const id = currentActivityId;
  currentActivityId = null;
  lastUpdateAt = 0;
  try {
    await mod.endActivity(id);
  } catch (err) {
    console.error('[live-activity] end failed', err);
  }
}
