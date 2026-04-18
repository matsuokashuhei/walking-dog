import { render, screen } from '@testing-library/react-native';
import { WalkControls } from './WalkControls';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (s: object) => unknown) =>
    selector({ startedAt: null, totalDistanceM: 0 }),
}));

jest.mock('@/lib/walk/format', () => ({
  formatTime: (sec: number) => `${sec}s`,
  formatDistance: (m: number) => `${m}m`,
}));

describe('WalkControls', () => {
  it('renders the three Precise metric labels: Time, Distance, Pace', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('Pace')).toBeTruthy();
  });

  it('renders a LIVE status tag', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('LIVE')).toBeTruthy();
  });

  it('renders the destructive End Walk button', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByRole('button', { name: 'End Walk' })).toBeTruthy();
  });

  it('disables End Walk when isStopping', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={true} />);
    const button = screen.getByRole('button', { name: 'End Walk' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });
});
