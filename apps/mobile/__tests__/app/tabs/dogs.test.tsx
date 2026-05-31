import { render, screen } from '@testing-library/react-native';
import DogsScreen from '../../../app/(tabs)/dogs';
import type { Dog } from '@/types/graphql';

const mockRedirect = jest.fn(({ href }: { href: string }) => {
  const { Text } = jest.requireActual('react-native');
  return <Text>Redirect:{href}</Text>;
});
const mockRefetch = jest.fn();

let mockDogs: Dog[] = [];

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: {
      dogs: mockDogs,
    },
    isLoading: false,
    refetch: mockRefetch,
  }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => ({
    todayKm: 0,
    goalKm: 5,
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
  EmptyState: ({ message }: { message: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{message}</Text>;
  },
}));

jest.mock('@/components/ui/LoadingScreen', () => ({
  LoadingScreen: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text>Loading</Text>;
  },
}));

jest.mock('@/components/ui/RingProgress', () => {
  const { View } = jest.requireActual('react-native');
  return { RingProgress: () => <View /> };
});

describe('DogsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDogs = [
      { id: 'dog-1', name: 'Pochi', breed: 'Shiba Inu', photoUrl: null, createdAt: '2026-01-01' },
      { id: 'dog-2', name: 'Hana', breed: null, photoUrl: null, createdAt: '2026-01-02' },
    ] as Dog[];
  });

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

  it('does not render Today walking goal in the dogs list', () => {
    render(<DogsScreen />);
    expect(screen.queryByText("Today's walking goal")).toBeNull();
  });

  it('renders header + Add CTA', () => {
    render(<DogsScreen />);
    expect(screen.getByRole('button', { name: '+ Add' })).toBeTruthy();
  });

  it('redirects the dogs tab to the only dog detail without leaving a loading screen', () => {
    mockDogs = [
      { id: 'dog-1', name: 'Pochi', breed: 'Shiba Inu', photoUrl: null, createdAt: '2026-01-01' },
    ] as Dog[];

    render(<DogsScreen />);

    expect(mockRedirect.mock.calls[0]?.[0]).toEqual({ href: '/dogs/dog-1' });
    expect(screen.getByText('Redirect:/dogs/dog-1')).toBeTruthy();
    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.queryByRole('header', { name: 'Dogs' })).toBeNull();
  });

  it('keeps the empty dogs state when no dogs exist', () => {
    mockDogs = [];

    render(<DogsScreen />);

    expect(screen.getByText('No dogs registered yet')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
