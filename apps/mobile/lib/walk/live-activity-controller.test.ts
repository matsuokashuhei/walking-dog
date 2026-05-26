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

  it('starts a live activity with an active recording deep link', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(activity);
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([]);

    await startWalkLiveActivity(props);

    expect(WalkingDogWalkActivity.start).toHaveBeenCalledWith(
      props,
      'walking-dog://walk-recording?walkId=walk-1',
    );
  });

  it('ends stale native instances before starting a new live activity', async () => {
    const staleActivity = { update: jest.fn(), end: jest.fn() };
    const newActivity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([staleActivity]);
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(newActivity);

    await startWalkLiveActivity(props);

    expect(staleActivity.end).toHaveBeenCalledWith('immediate', undefined);
    expect(WalkingDogWalkActivity.start).toHaveBeenCalledTimes(1);
  });

  it('starts a new live activity even when ending a stale native instance fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const staleError = new Error('stale end failed');
    const staleActivity = { update: jest.fn(), end: jest.fn().mockRejectedValue(staleError) };
    const newActivity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([staleActivity]);
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(newActivity);

    await startWalkLiveActivity(props);

    expect(WalkingDogWalkActivity.start).toHaveBeenCalledWith(
      props,
      'walking-dog://walk-recording?walkId=walk-1',
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[walk.liveActivity.endExisting] failed',
      staleError,
    );

    consoleErrorSpy.mockRestore();
  });

  it('updates the active live activity', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(activity);
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([]);
    await startWalkLiveActivity(props);

    await updateWalkLiveActivity({ ...props, distanceLabel: '1.23 km' });

    expect(activity.update).toHaveBeenCalledWith({ ...props, distanceLabel: '1.23 km' });
  });

  it('uses an existing native instance when the process lost its local reference', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([activity]);

    await updateWalkLiveActivity(props);

    expect(activity.update).toHaveBeenCalledWith(props);
  });

  it('updates every native instance so stale lock-screen activities do not display old timers', async () => {
    const activityA = { update: jest.fn(), end: jest.fn() };
    const activityB = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([activityA, activityB]);

    await updateWalkLiveActivity(props);

    expect(activityA.update).toHaveBeenCalledWith(props);
    expect(activityB.update).toHaveBeenCalledWith(props);
  });

  it('ends the active live activity immediately', async () => {
    const activity = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.start as jest.Mock).mockReturnValue(activity);
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([]);
    await startWalkLiveActivity(props);

    await endWalkLiveActivity({ ...props, distanceLabel: 'finished' });

    expect(activity.end).toHaveBeenCalledWith('immediate', {
      ...props,
      distanceLabel: 'finished',
    });
  });

  it('ends every native instance without passing a content date', async () => {
    const activityA = { update: jest.fn(), end: jest.fn() };
    const activityB = { update: jest.fn(), end: jest.fn() };
    (WalkingDogWalkActivity.getInstances as jest.Mock).mockReturnValue([activityA, activityB]);

    await endWalkLiveActivity(props);

    expect(activityA.end).toHaveBeenCalledWith('immediate', props);
    expect(activityB.end).toHaveBeenCalledWith('immediate', props);
  });
});
