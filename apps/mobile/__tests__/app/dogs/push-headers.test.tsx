import type { ReactElement } from 'react';
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
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  function Stack({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  function StackScreen({
    name,
    options,
  }: {
    name: string;
    options?: { headerShown?: boolean; title?: string };
  }) {
    if (options?.headerShown === false) {
      return null;
    }

    return <Text accessibilityRole="header">{options?.title ?? name}</Text>;
  }

  Stack.Screen = StackScreen;

  return {
    Stack,
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

  it('renders Members with exactly one inline ScreenHeader and back action', () => {
    renderWithLayout(<DogMembersScreen />);

    expectSingleHeader('Members');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders Encounter History with exactly one inline ScreenHeader and back action', () => {
    renderWithLayout(<DogEncountersScreen />);

    expectSingleHeader('Encounter History');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders Friends with exactly one inline ScreenHeader and back action', () => {
    renderWithLayout(<DogFriendsScreen />);

    expectSingleHeader('Friends');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

function renderWithLayout(screenElement: ReactElement) {
  render(
    <>
      <DogDetailLayout />
      {screenElement}
    </>,
  );
}

function expectSingleHeader(name: string) {
  expect(screen.getAllByRole('header')).toHaveLength(1);
  expect(screen.getByRole('header', { name })).toBeTruthy();
}
