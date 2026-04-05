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
  it('renders duration label', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('DURATION')).toBeTruthy();
  });

  it('renders distance metric card', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByText('Distance')).toBeTruthy();
  });

  it('renders finish button', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={false} />);
    expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
  });

  it('disables finish button when isStopping', () => {
    render(<WalkControls onStop={jest.fn()} isStopping={true} />);
    const button = screen.getByRole('button', { name: 'Finish' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });
});
