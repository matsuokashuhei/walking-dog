import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { WalkControls } from './WalkControls';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

const mockWalkStoreState = {
  startedAt: null as Date | null,
  totalDistanceM: 0,
};

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: typeof mockWalkStoreState) => unknown) =>
    selector(mockWalkStoreState),
}));

jest.mock('@/lib/walk/format', () => ({
  formatTime: (sec: number) => `${sec}s`,
  formatDistance: (m: number) => `${m}m`,
  formatDistanceParts: (m: number) => ({ value: `${m}`, unit: 'm' }),
  formatPace: () => ({ value: '—', unit: '/km' }),
  formatPaceString: () => "—/km",
}));

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: null,
  gender: null,
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-02',
};

function panEvent(currentPageX: number, previousPageX = 0, timestamp = 1) {
  return {
    nativeEvent: {},
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX,
          currentPageY: 0,
          currentTimeStamp: timestamp,
          previousPageX,
          previousPageY: 0,
          previousTimeStamp: timestamp - 1,
          touchActive: true,
        },
      ],
    },
  };
}

describe('WalkControls', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockWalkStoreState.startedAt = null;
    mockWalkStoreState.totalDistanceM = 0;
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.useRealTimers();
  });

  it('renders the three Precise metric labels: Time, Distance, Pace', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('Pace')).toBeTruthy();
  });

  it('renders a LIVE status tag', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('LIVE')).toBeTruthy();
  });

  it('renders the slide control instead of Pause or Resume buttons', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByRole('button', { name: 'slide to end walk' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
  });

  it('renders a minimize button and calls onMinimize', () => {
    const onMinimize = jest.fn();
    render(
      <WalkControls
        dogs={[coco]}
        onStop={jest.fn()}
        isStopping={false}
        onMinimize={onMinimize}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Minimize' }));

    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('disables the slide control when isStopping', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={true} />);
    const button = screen.getByRole('button', { name: 'slide to end walk' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders single-dog identity with dog name and contextual walk label', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('Coco')).toBeTruthy();
    const anyLabel =
      screen.queryByText('Morning walk') ||
      screen.queryByText('Afternoon walk') ||
      screen.queryByText('Evening walk');
    expect(anyLabel).toBeTruthy();
  });

  it('renders multi-dog identity with concatenated names and Group walk subtitle', () => {
    render(<WalkControls dogs={[coco, momo]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('Coco + Momo')).toBeTruthy();
    expect(screen.getByText('Group walk · together')).toBeTruthy();
  });

  it('updates the elapsed metric while the walk is active', () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00.000Z'));
    mockWalkStoreState.startedAt = new Date('2026-04-20T09:59:54.000Z');

    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('6s')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('8s')).toBeTruthy();
  });

  it('asks for confirmation after a completed slide before stopping the walk', () => {
    const onStop = jest.fn();
    render(<WalkControls dogs={[coco]} onStop={onStop} isStopping={false} />);

    fireEvent(screen.getByTestId('walk-end-slide-control'), 'layout', {
      nativeEvent: { layout: { width: 320 } },
    });
    const thumb = screen.getByTestId('walk-end-slide-thumb');
    fireEvent(thumb, 'responderGrant', panEvent(0, 0, 1));
    fireEvent(thumb, 'responderMove', panEvent(260, 0, 2));
    fireEvent(thumb, 'responderRelease', panEvent(260, 260, 3));

    expect(onStop).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'End this walk?',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'End Walk', style: 'destructive' }),
      ]),
      expect.objectContaining({ cancelable: true }),
    );

    const alertButtons = alertSpy.mock.calls[0][2] as AlertButton[] | undefined;
    const confirm = alertButtons?.find((button) => button.text === 'End Walk');
    confirm?.onPress?.();

    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
