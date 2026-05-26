import type { LiveActivity } from 'expo-widgets';
import { type WalkActivityProps } from './live-activity';

let activeActivity: LiveActivity<WalkActivityProps> | null = null;
let activityFactory: typeof import('./live-activity-widget').WalkingDogWalkActivity | null = null;

function getActivityFactory(): typeof import('./live-activity-widget').WalkingDogWalkActivity {
  if (activityFactory) return activityFactory;

  // The widget module imports native SwiftUI bindings. Keep that import lazy so
  // non-widget unit tests can import the controller without loading ExpoWidgets.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  activityFactory = require('./live-activity-widget').WalkingDogWalkActivity as typeof import(
    './live-activity-widget'
  ).WalkingDogWalkActivity;
  return activityFactory;
}

function getKnownActivities(
  factory: typeof import('./live-activity-widget').WalkingDogWalkActivity,
): LiveActivity<WalkActivityProps>[] {
  const nativeActivities = factory.getInstances();
  if (!activeActivity) return nativeActivities;
  return nativeActivities.includes(activeActivity)
    ? nativeActivities
    : [activeActivity, ...nativeActivities];
}

export function walkRecordingActivityUrl(walkId: string): string {
  return `walking-dog://walk-recording?walkId=${encodeURIComponent(walkId)}`;
}

async function endExistingNativeActivities(
  factory: typeof import('./live-activity-widget').WalkingDogWalkActivity,
) {
  const existingActivities = getKnownActivities(factory);
  const results = await Promise.allSettled(
    existingActivities.map((activity) => activity.end('immediate', undefined)),
  );
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[walk.liveActivity.endExisting] failed', result.reason);
    }
  }
  activeActivity = null;
}

export async function startWalkLiveActivity(props: WalkActivityProps): Promise<void> {
  const factory = getActivityFactory();
  await endExistingNativeActivities(factory);
  activeActivity = factory.start(props, walkRecordingActivityUrl(props.walkId));
}

export async function updateWalkLiveActivity(props: WalkActivityProps): Promise<void> {
  const factory = getActivityFactory();
  const activities = getKnownActivities(factory);
  if (activities.length === 0) return;

  await Promise.all(activities.map((activity) => activity.update(props)));
  activeActivity = activities[0];
}

export async function endWalkLiveActivity(props?: WalkActivityProps): Promise<void> {
  const factory = getActivityFactory();
  const activities = getKnownActivities(factory);
  if (activities.length === 0) return;

  await Promise.all(activities.map((activity) => activity.end('immediate', props)));
  activeActivity = null;
}

export function resetWalkLiveActivityForTest(): void {
  activeActivity = null;
  activityFactory = null;
}
