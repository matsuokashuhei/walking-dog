import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DogDetailScreen from '../../../app/dogs/[id]/index';
import type { DogWithStats } from '@/types/graphql';
import { spacing } from '@/theme/tokens';

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
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockDog: DogWithStats = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  gender: 'Male',
  birthday: null,
  photoUrl: null,
  role: 'owner',
  createdAt: '2024-01-01',
  walkStats: null,
};

let mockMeData: { id: string } | undefined = { id: 'user-1' };
let mockDogData: DogWithStats = mockDog;
let mockPack = {
  perDog: {
    'dog-1': { todayKm: 1.42, totalWalks: 10, streakDays: 3 },
  },
  goalKm: 5,
};

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
  usePackProgress: () => mockPack,
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

function getNodeTestID(node: object): string | null {
  if (!('props' in node) || !node.props || typeof node.props !== 'object') return null;
  if (!('testID' in node.props) || typeof node.props.testID !== 'string') return null;
  return node.props.testID;
}

function getNodeChildren(node: object): unknown[] {
  if (!('children' in node) || !Array.isArray(node.children)) return [];
  return node.children;
}

function collectTestIds(node: unknown): string[] {
  if (!node || typeof node === 'string' || typeof node === 'number') return [];
  if (Array.isArray(node)) return node.flatMap(collectTestIds);
  if (typeof node !== 'object') return [];

  const testID = getNodeTestID(node);
  return [
    ...(testID ? [testID] : []),
    ...getNodeChildren(node).flatMap(collectTestIds),
  ];
}

describe('DogDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeData = { id: 'user-1' };
    mockDogData = mockDog;
    mockPack = {
      perDog: {
        'dog-1': { todayKm: 1.42, totalWalks: 10, streakDays: 3 },
      },
      goalKm: 5,
    };
    mockCanGoBack = true;
  });

  it('shows delete button for owner', () => {
    mockMeData = { id: 'user-1' }; // owner
    renderWithProviders(<DogDetailScreen />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('hides delete button for non-owner member', () => {
    mockDogData = { ...mockDog, role: 'member' };
    renderWithProviders(<DogDetailScreen />);
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('renders the large title screen header with dog title and back action', () => {
    renderWithProviders(<DogDetailScreen />);

    expect(screen.getByTestId('dog-detail-header')).toBeTruthy();
    expect(screen.getByTestId('dog-detail-header-action-row')).toBeTruthy();
    expect(screen.getByTestId('dog-detail-header-large-title-row')).toBeTruthy();
    expect(screen.getAllByText('Buddy')).toHaveLength(1);
    expect(screen.getByLabelText('Dogs')).toBeTruthy();
  });

  it('renders edit button exactly once in screen header for owner', () => {
    renderWithProviders(<DogDetailScreen />);
    // Regression guard: Edit must appear exactly once (no duplicate from
    // a stray Stack header reintroduction).
    expect(screen.getAllByText('Edit')).toHaveLength(1);
  });

  it('hides edit button for non-owner member', () => {
    mockDogData = { ...mockDog, role: 'member' };
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

  it('keeps dog metadata visible without duplicating the body dog name', () => {
    renderWithProviders(<DogDetailScreen />);

    expect(screen.getAllByText('Buddy')).toHaveLength(1);
    expect(screen.getByText('Golden Retriever')).toBeTruthy();
  });

  it('uses the medium horizontal inset for the walks section', () => {
    renderWithProviders(<DogDetailScreen />);

    const walksSection = screen.getByTestId('dog-detail-walks-section');
    const style = StyleSheet.flatten(walksSection.props.style);

    expect(style.paddingHorizontal).toBe(spacing.md);
  });

  it('renders the dog-specific walking goal before walks', () => {
    const rendered = renderWithProviders(<DogDetailScreen />);

    expect(screen.getByText("Today's walking goal")).toBeTruthy();
    expect(screen.getByText('1.42 / 5.0 km for Buddy')).toBeTruthy();
    expect(screen.getByText('28%')).toBeTruthy();

    const goalSection = screen.getByTestId('dog-detail-walking-goal-section');
    const walksSection = screen.getByTestId('dog-detail-walks-section');
    const sections = collectTestIds(rendered.toJSON()).filter(
      (testID) =>
        testID === 'dog-detail-walking-goal-section' ||
        testID === 'dog-detail-walks-section',
    );

    expect(goalSection).toBeTruthy();
    expect(walksSection).toBeTruthy();
    expect(sections).toEqual([
      'dog-detail-walking-goal-section',
      'dog-detail-walks-section',
    ]);
  });

  it('hides delete button when dog has no role', () => {
    mockDogData = { ...mockDog, role: undefined };
    renderWithProviders(<DogDetailScreen />);
    expect(screen.queryByText('Delete')).toBeNull();
  });
});
