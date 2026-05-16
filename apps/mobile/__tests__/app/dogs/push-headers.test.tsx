import { fireEvent, render, screen } from '@testing-library/react-native';
import DogDetailLayout from '../../../app/dogs/[id]/_layout';
import DogEncountersScreen from '../../../app/dogs/[id]/encounters';
import DogFriendsScreen from '../../../app/dogs/[id]/friends';
import DogMembersScreen from '../../../app/dogs/[id]/members';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const StackScreen = jest.fn(() => null);

  function Stack({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  Stack.Screen = StackScreen;

  return {
    Stack,
    __mockStackScreen: StackScreen,
    useLocalSearchParams: () => ({ id: 'dog-1' }),
    useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
  };
});

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

const mockDog = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  gender: 'MALE',
  birthday: null,
  photoUrl: null,
  createdAt: '2026-01-01',
  walkStats: null,
  members: [
    {
      id: 'member-1',
      userId: 'user-1',
      role: 'owner' as const,
      user: { displayName: 'Alice', avatarUrl: null },
      createdAt: '2026-01-01',
    },
  ],
};

jest.mock('@/hooks/use-dog', () => ({
  useDog: () => ({ data: mockDog, isLoading: false }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: { id: 'user-1' }, isLoading: false }),
}));

jest.mock('@/hooks/use-dog-member-mutations', () => ({
  useGenerateInvitation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRemoveMember: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLeaveDog: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-mutation-with-alert', () => ({
  useMutationWithAlert: () => async (run: () => Promise<unknown>) => run(),
}));

jest.mock('@/hooks/use-dog-encounters', () => ({
  useDogEncounters: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/hooks/use-dog-friends', () => ({
  useDogFriends: () => ({ data: [], isLoading: false }),
}));

describe('dog push screen headers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables native Stack headers for screens migrated to ScreenHeader', () => {
    render(<DogDetailLayout />);

    expectStackHeaderHidden('members');
    expectStackHeaderHidden('friends/index');
    expectStackHeaderHidden('encounters');
  });

  it('renders Members with an inline ScreenHeader back action', () => {
    render(<DogMembersScreen />);

    expect(screen.getByRole('header', { name: 'Members' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders Encounter History with an inline ScreenHeader back action', () => {
    render(<DogEncountersScreen />);

    expect(screen.getByRole('header', { name: 'Encounter History' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders Friends with an inline ScreenHeader back action', () => {
    render(<DogFriendsScreen />);

    expect(screen.getByRole('header', { name: 'Friends' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

function expectStackHeaderHidden(name: string) {
  const { __mockStackScreen } = jest.requireMock('expo-router') as {
    __mockStackScreen: jest.Mock;
  };
  const call = __mockStackScreen.mock.calls.find(([props]) => props?.name === name);
  expect(call?.[0]?.options?.headerShown).toBe(false);
}
