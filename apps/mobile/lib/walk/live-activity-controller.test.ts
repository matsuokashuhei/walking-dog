import type { WalkActivityProps } from './live-activity';
import {
  endWalkLiveActivity,
  resetWalkLiveActivityForTest,
  startWalkLiveActivity,
  updateWalkLiveActivity,
} from './live-activity-controller';
import { WalkingDogWalkActivity } from './live-activity-widget';

jest.mock('./live-activity-widget', () => ({
  WalkingDogWalkActivity: {
    start: jest.fn(),
    getInstances: jest.fn(),
  },
}));

const props: WalkActivityProps = {
  walkId: 'walk-1',
  startedAtMs: Date.parse('2026-05-24T00:00:00.000Z'),
  distanceLabel: '80 m',
  dogs: [],
  finishTarget: 'finish',
};

describe('walk live activity controller', () => {
  beforeEach(() => {
    resetWalkLiveActivityForTest();
    jest.clearAllMocks();
  });

  it('starts a live activity with a walk deep link', () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(activity);

    startWalkLiveActivity(props);

    expect(WalkingDogWalkActivity.start).toHaveBeenCalledWith(
      props,
      'walking-dog://walks/walk-1',
    );
  });

  it('updates the active live activity', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(activity);
    startWalkLiveActivity(props);

    await updateWalkLiveActivity({ ...props, distanceLabel: '1.23 km' });

    expect(activity.update).toHaveBeenCalledWith({ ...props, distanceLabel: '1.23 km' });
  });

  it('reconciles stale native live activity references when an update says the activity is missing', async () => {
    const staleActivity = {
      update: jest.fn().mockRejectedValue(
        new Error(
          "Calling the 'update' function has failed -> Caused by: Can't find live activity with id: missing-activity",
        ),
      ),
      end: jest.fn(),
    };
    const currentActivity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(staleActivity);
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([currentActivity]);
    startWalkLiveActivity(props);

    await expect(updateWalkLiveActivity(props)).resolves.toBeUndefined();
    await updateWalkLiveActivity({ ...props, distanceLabel: '1.23 km' });

    expect(currentActivity.update).toHaveBeenCalledWith({ ...props, distanceLabel: '1.23 km' });
  });

  it('uses an existing native instance when the process lost its local reference', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([activity]);

    await updateWalkLiveActivity(props);

    expect(activity.update).toHaveBeenCalledWith(props);
  });

  it('ends the active live activity immediately', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(activity);
    startWalkLiveActivity(props);

    await endWalkLiveActivity({ ...props, distanceLabel: 'finished' });

    expect(activity.end).toHaveBeenCalledWith('immediate', {
      ...props,
      distanceLabel: 'finished',
    });
  });
});
