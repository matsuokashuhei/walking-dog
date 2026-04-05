import { render, screen } from '@testing-library/react-native';
import { WalkHistoryItem } from './WalkHistoryItem';
import type { Walk } from '@/types/graphql';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const baseWalk: Walk = {
  id: 'walk-1',
  dogs: [{ id: 'dog-1', name: 'Buddy', breed: null, gender: null, birthDate: null, photoUrl: null, createdAt: '2026-01-01' }],
  status: 'FINISHED',
  distanceM: 2500,
  durationSec: 1800,
  startedAt: '2026-04-01T10:00:00Z',
  endedAt: '2026-04-01T10:30:00Z',
};

describe('WalkHistoryItem', () => {
  it('renders walker display name when walker is present', () => {
    const walk: Walk = {
      ...baseWalk,
      walker: { id: 'user-1', displayName: 'Alice', avatarUrl: null },
    };
    render(<WalkHistoryItem walk={walk} />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders without walker when walker is not present', () => {
    render(<WalkHistoryItem walk={baseWalk} />);
    expect(screen.queryByTestId('walker-name')).toBeNull();
  });

  it('renders walker initials when avatarUrl is null and displayName is present', () => {
    const walk: Walk = {
      ...baseWalk,
      walker: { id: 'user-1', displayName: 'Alice', avatarUrl: null },
    };
    render(<WalkHistoryItem walk={walk} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders walker avatar image when avatarUrl is provided', () => {
    const walk: Walk = {
      ...baseWalk,
      walker: { id: 'user-1', displayName: 'Alice', avatarUrl: 'https://example.com/alice.jpg' },
    };
    render(<WalkHistoryItem walk={walk} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    // Avatar image element should exist (no initials fallback)
    expect(screen.queryByText('A')).toBeNull();
  });

  it('renders multiple dog names joined by comma', () => {
    const walk: Walk = {
      ...baseWalk,
      dogs: [
        { id: 'dog-1', name: 'Buddy', breed: null, gender: null, birthDate: null, photoUrl: null, createdAt: '2026-01-01' },
        { id: 'dog-2', name: 'Max', breed: null, gender: null, birthDate: null, photoUrl: null, createdAt: '2026-01-01' },
      ],
    };
    render(<WalkHistoryItem walk={walk} />);
    expect(screen.getByText('Buddy, Max')).toBeTruthy();
  });

  it('renders 0 distance and duration when values are null', () => {
    const walk: Walk = {
      ...baseWalk,
      distanceM: null as unknown as number,
      durationSec: null as unknown as number,
    };
    render(<WalkHistoryItem walk={walk} />);
    // Should not crash and should render both zero values
    const zeros = screen.getAllByText(/0/);
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
