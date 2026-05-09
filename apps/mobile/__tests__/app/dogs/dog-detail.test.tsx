import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DogDetailScreen from '../../../app/dogs/[id]/index';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'dog-1' }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockDog = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  gender: 'Male',
  birthDate: null,
  photoUrl: null,
  role: 'owner' as const,
  createdAt: '2024-01-01',
  walkStats: null,
  members: [
    {
      id: 'member-1',
      userId: 'user-1',
      role: 'owner' as const,
      user: { displayName: 'Owner User', avatarUrl: null },
      createdAt: '2024-01-01',
    },
    {
      id: 'member-2',
      userId: 'user-2',
      role: 'member' as const,
      user: { displayName: 'Member User', avatarUrl: null },
      createdAt: '2024-01-02',
    },
  ],
};

let mockMeData: { id: string } | undefined = { id: 'user-1' };
let mockDogData = mockDog;

jest.mock('@/hooks/use-dog', () => ({
  useDog: () => ({ data: mockDogData, isLoading: false }),
}));

jest.mock('@/hooks/use-dog-mutations', () => ({
  useDeleteDog: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({ data: mockMeData }),
}));

jest.mock('@/hooks/use-pack-progress', () => ({
  usePackProgress: () => ({ perDog: {} }),
}));

jest.mock('@/hooks/use-walks', () => ({
  useMyWalks: () => ({ data: [] }),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: true }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('DogDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeData = { id: 'user-1' };
    mockDogData = mockDog;
    mockCanGoBack = true;
  });

  it('shows delete button for owner', () => {
    mockMeData = { id: 'user-1' }; // owner
    renderWithProviders(<DogDetailScreen />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('hides delete button for non-owner member', () => {
    mockMeData = { id: 'user-2' }; // member, not owner
    renderWithProviders(<DogDetailScreen />);
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('renders edit button exactly once in hero nav overlay for owner', () => {
    renderWithProviders(<DogDetailScreen />);
    // Regression guard: Edit must appear exactly once (no duplicate from
    // a stray Stack header reintroduction).
    expect(screen.getAllByText('Edit')).toHaveLength(1);
  });

  it('hides edit button for non-owner member', () => {
    mockMeData = { id: 'user-2' }; // member, not owner
    renderWithProviders(<DogDetailScreen />);
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('navigates to edit screen when edit button is pressed (owner)', () => {
    renderWithProviders(<DogDetailScreen />);
    fireEvent.press(screen.getByLabelText('Edit'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/dogs/[id]/edit',
      params: { id: 'dog-1' },
    });
  });

  it('calls router.back when back button is pressed and history exists', () => {
    mockCanGoBack = true;
    renderWithProviders(<DogDetailScreen />);
    fireEvent.press(screen.getByLabelText('Dogs'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to /(tabs)/dogs when no history exists (deep-link entry)', () => {
    mockCanGoBack = false;
    renderWithProviders(<DogDetailScreen />);
    fireEvent.press(screen.getByLabelText('Dogs'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dogs');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('hides delete button when user is not in members list', () => {
    mockMeData = { id: 'user-unknown' };
    renderWithProviders(<DogDetailScreen />);
    expect(screen.queryByText('Delete')).toBeNull();
  });
});
