import { fireEvent, render, screen } from '@testing-library/react-native';
import { WalkControls } from './WalkControls';
import type { Dog } from '@/types/graphql';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({ Image: 'Image' }));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: object) => unknown) =>
    selector({ startedAt: null, totalDistanceM: 0 }),
}));

jest.mock('@/lib/walk/format', () => ({
  formatTime: (sec: number) => `${sec}s`,
  formatDistance: (m: number) => `${m}m`,
  formatPace: () => ({ value: '—', unit: '/km' }),
  formatPaceString: () => "—/km",
}));

const coco: Dog = {
  id: 'dog-1',
  name: 'Coco',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01',
};

const momo: Dog = {
  id: 'dog-2',
  name: 'Momo',
  breed: null,
  gender: null,
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-02',
};

describe('WalkControls', () => {
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

  it('renders the destructive End Walk button', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByRole('button', { name: 'End Walk' })).toBeTruthy();
  });

  it('disables End Walk when isStopping', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={true} />);
    const button = screen.getByRole('button', { name: 'End Walk' });
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

  it('Pause button toggles to Resume when pressed', () => {
    render(<WalkControls dogs={[coco]} onStop={jest.fn()} isStopping={false} />);
    const pause = screen.getByRole('button', { name: 'Pause' });
    fireEvent.press(pause);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
  });
});
