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

function getActiveActivity(): LiveActivity<WalkActivityProps> | null {
  if (activeActivity) return activeActivity;
  activeActivity = getActivityFactory().getInstances()[0] ?? null;
  return activeActivity;
}

function isMissingLiveActivityError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Can't find live activity with id:")
  );
}

export function startWalkLiveActivity(props: WalkActivityProps): void {
  activeActivity = getActivityFactory().start(props, `walking-dog://walks/${props.walkId}`);
}

export async function updateWalkLiveActivity(props: WalkActivityProps): Promise<void> {
  const activity = getActiveActivity();
  if (!activity) return;

  try {
    await activity.update(props);
  } catch (error) {
    if (isMissingLiveActivityError(error)) {
      activeActivity = null;
      return;
    }

    throw error;
  }
}

export async function endWalkLiveActivity(props?: WalkActivityProps): Promise<void> {
  const activity = getActiveActivity();
  if (!activity) return;

  try {
    await activity.end('immediate', props);
  } catch (error) {
    if (!isMissingLiveActivityError(error)) {
      throw error;
    }
  } finally {
    activeActivity = null;
  }
}

export function resetWalkLiveActivityForTest(): void {
  activeActivity = null;
  activityFactory = null;
}
