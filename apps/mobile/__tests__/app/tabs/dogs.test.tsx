import { render, screen } from '@testing-library/react-native';
import DogsScreen from '../../../app/(tabs)/dogs/index';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/icon-symbol', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: {
      dogs: [
        { id: 'dog-1', name: 'Pochi', breed: 'Shiba Inu', photoUrl: null, createdAt: '2026-01-01' },
        { id: 'dog-2', name: 'Hana', breed: null, photoUrl: null, createdAt: '2026-01-02' },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => ({
    todayKm: 0,
    todayMinutes: 0,
    goalProgressMinutes: 0,
    goalMinutes: 60,
    progressPct: 0,
    perDog: {},
    isLoading: false,
  }),
}));

jest.mock('@/components/dogs/DogListItem', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    DogListItem: ({ dog }: { dog: { name: string } }) => <Text>{dog.name}</Text>,
  };
});

jest.mock('@/components/ui/EmptyState', () => ({
  EmptyState: () => null,
}));

jest.mock('@/components/ui/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

jest.mock('@/components/ui/RingProgress', () => {
  const { View } = jest.requireActual('react-native');
  return { RingProgress: () => <View /> };
});

describe('DogsScreen', () => {
  it('renders YOUR PACK section label', () => {
    render(<DogsScreen />);
    expect(screen.getByText('YOUR PACK')).toBeTruthy();
  });

  it('renders Dogs as the shared screen header', () => {
    render(<DogsScreen />);

    expect(screen.getByRole('header', { name: 'Dogs' })).toBeTruthy();
    expect(screen.getByTestId('dogs-header-large-title-row')).toBeTruthy();
    expect(screen.getByTestId('dogs-header-left-action-slot')).toBeTruthy();
    expect(screen.getByTestId('dogs-header-right-action-slot')).toBeTruthy();
  });

  it('does not render the goal progress rollup in the pack list header', () => {
    render(<DogsScreen />);
    expect(screen.queryByText('Goal progress')).toBeNull();
  });

  it('renders the header add action as an icon-only circular button', () => {
    render(<DogsScreen />);

    expect(screen.getByRole('button', { name: 'Add Dog' })).toBeTruthy();
    expect(screen.getByText('plus')).toBeTruthy();
    expect(screen.queryByText('+ Add')).toBeNull();
  });
});
