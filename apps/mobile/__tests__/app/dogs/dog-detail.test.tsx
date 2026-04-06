import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DogDetailScreen from '../../../app/dogs/[id]/index';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'dog-1' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
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

  it('shows edit button for both owner and member', () => {
    mockMeData = { id: 'user-2' }; // member, not owner
    renderWithProviders(<DogDetailScreen />);
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('hides delete button when user is not in members list', () => {
    mockMeData = { id: 'user-unknown' };
    renderWithProviders(<DogDetailScreen />);
    expect(screen.queryByText('Delete')).toBeNull();
  });
});
