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

function isMissingLiveActivityError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Can't find live activity with id:")
  );
}

function walkRecordingActivityUrl(walkId: string): string {
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
    if (result.status === 'rejected' && !isMissingLiveActivityError(result.reason)) {
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

  const results = await Promise.allSettled(activities.map((activity) => activity.update(props)));
  const firstSuccessfulActivity = activities.find((_, index) => results[index].status === 'fulfilled');
  const unexpectedError = results.find(
    (result) => result.status === 'rejected' && !isMissingLiveActivityError(result.reason),
  );
  if (unexpectedError?.status === 'rejected') {
    throw unexpectedError.reason;
  }
  activeActivity = firstSuccessfulActivity ?? null;
}

export async function endWalkLiveActivity(props?: WalkActivityProps): Promise<void> {
  const factory = getActivityFactory();
  const activities = getKnownActivities(factory);
  if (activities.length === 0) return;

  const results = await Promise.allSettled(activities.map((activity) => activity.end('immediate', props)));
  const unexpectedError = results.find(
    (result) => result.status === 'rejected' && !isMissingLiveActivityError(result.reason),
  );
  activeActivity = null;
  if (unexpectedError?.status === 'rejected') {
    throw unexpectedError.reason;
  }
}

export function resetWalkLiveActivityForTest(): void {
  activeActivity = null;
  activityFactory = null;
}
