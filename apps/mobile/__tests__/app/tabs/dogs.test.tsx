import { render, screen } from '@testing-library/react-native';
import DogsScreen from './dogs';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

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

jest.mock('@/components/themed-text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ThemedText: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

describe('DogsScreen', () => {
  it('renders YOUR PACK section label', () => {
    render(<DogsScreen />);
    expect(screen.getByText('YOUR PACK')).toBeTruthy();
  });

  it('renders Dogs heading', () => {
    render(<DogsScreen />);
    expect(screen.getByText('My Dogs')).toBeTruthy();
  });

  it('renders dog count stat', () => {
    render(<DogsScreen />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders add dog FAB', () => {
    render(<DogsScreen />);
    expect(screen.getByRole('button', { name: 'Add Dog' })).toBeTruthy();
  });
});
