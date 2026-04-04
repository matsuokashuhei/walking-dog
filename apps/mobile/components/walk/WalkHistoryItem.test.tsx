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
});
