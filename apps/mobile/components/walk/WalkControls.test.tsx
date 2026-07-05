import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { WalkControls } from './WalkControls';
import { components } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

jest.mock('@react-native-community/slider', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onValueChange,
      onSlidingComplete,
      ...props
    }: {
      onValueChange?: (value: number) => void;
      onSlidingComplete?: (value: number) => void;
    }) => (
      <View
        {...props}
        accessibilityRole="adjustable"
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
      />
    ),
  };
});

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

describe('WalkControls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWalkStoreState.startedAt = null;
    mockWalkStoreState.totalDistanceM = 0;
  });

  afterEach(() => {
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

  it('renders native slide-to-end control without the Pause button', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByTestId('walk-end-rn-slider')).toBeTruthy();
    expect(screen.getByTestId('walk-end-slider-knob')).toBeTruthy();
    expect(screen.getByText('End Walk')).toBeTruthy();
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

  it('disables End Walk when isStopping', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={true} />);
    const slider = screen.getByTestId('walk-end-rn-slider');
    expect(slider.props.disabled).toBe(true);
  });

  it('uses a transparent RN slider thumb so the custom circular knob owns the visuals', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    const slider = screen.getByTestId('walk-end-rn-slider');
    expect(slider.props.thumbSize).toBe(components.walkControls.endSlideKnobSize);
    expect(slider.props.thumbTintColor).toBe('#00000000');
    expect(slider.props.minimumTrackTintColor).toBe('#00000000');
    expect(slider.props.maximumTrackTintColor).toBe('#00000000');
  });

  it('aligns the native slider thumb with the visible circular knob', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    const sliderStyle = StyleSheet.flatten(screen.getByTestId('walk-end-rn-slider').props.style);
    const thumbCenter =
      components.walkControls.endSlideKnobInset +
      components.walkControls.endSlideKnobSize / 2;
    expect(sliderStyle.left).toBe(thumbCenter);
    expect(sliderStyle.right).toBe(thumbCenter);
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

  it('ends the walk only after releasing the slide at the end', () => {
    const onStop = jest.fn();
    render(<WalkControls dogs={[coco]} onStop={onStop} isStopping={false} />);

    const slider = screen.getByTestId('walk-end-rn-slider');
    fireEvent(slider, 'onValueChange', 1);
    expect(onStop).not.toHaveBeenCalled();

    fireEvent(slider, 'onSlidingComplete', 1);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('resets the end slider when a stop attempt returns to idle', () => {
    const onStop = jest.fn();
    const { rerender } = render(
      <WalkControls dogs={[coco]} onStop={onStop} isStopping={false} />,
    );

    fireEvent(screen.getByTestId('walk-end-rn-slider'), 'onValueChange', 1);
    fireEvent(screen.getByTestId('walk-end-rn-slider'), 'onSlidingComplete', 1);
    rerender(<WalkControls dogs={[coco]} onStop={onStop} isStopping={true} />);
    rerender(<WalkControls dogs={[coco]} onStop={onStop} isStopping={false} />);

    expect(screen.getByTestId('walk-end-rn-slider').props.value).toBe(0);
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
});
