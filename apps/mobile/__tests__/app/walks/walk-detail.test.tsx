import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WalkDetailScreen from '../../../app/walks/[id]';
import type { Walk } from '@/types/graphql';

const mockWalk: Walk = {
  id: 'walk-1',
  dogs: [{ id: 'dog-1', name: 'Buddy', breed: null, gender: null, birthDate: null, photoUrl: null, createdAt: '2026-01-01' }],
  walker: { id: 'user-1', displayName: 'Alice', avatarUrl: null },
  status: 'FINISHED',
  distanceM: 2500,
  durationSec: 1800,
  startedAt: '2026-04-01T10:00:00Z',
  endedAt: '2026-04-01T10:30:00Z',
  points: [],
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'walk-1' }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Polyline: View,
  };
});

jest.mock('@/hooks/use-walks', () => ({
  useWalk: () => ({ data: mockWalk, isLoading: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('WalkDetailScreen walker info', () => {
  it('displays walker name', () => {
    renderWithProviders(<WalkDetailScreen />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('displays walker initial when avatarUrl is null', () => {
    renderWithProviders(<WalkDetailScreen />);
    expect(screen.getByText('A')).toBeTruthy();
  });
});
