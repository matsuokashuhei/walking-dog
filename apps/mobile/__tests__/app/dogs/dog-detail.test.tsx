import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DogDetailScreen from '../../../app/dogs/[id]/index';
import type { DogWithStats, Walk } from '@/types/graphql';
import { colors, dogContactChrome, spacing } from '@/theme/tokens';

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

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: ({ children, ...props }: { children: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('@/components/ui/icon-symbol', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

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
  createdAt: '2024-01-01',
  walkStats: null,
};

let mockDogData: DogWithStats = mockDog;
let mockWalks: Walk[] = [];

jest.mock('@/hooks/use-dog', () => ({
  useDog: () => ({ data: mockDogData, isLoading: false }),
}));

jest.mock('@/hooks/use-walks', () => ({
  useMyWalks: () => ({ data: mockWalks }),
}));

jest.mock('@/components/ui/RingProgress', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    RingProgress: ({ label }: { label?: string }) => <Text>{label}</Text>,
  };
});

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

function collectTestIds(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];

  const testNode = node as {
    props?: { testID?: string };
    children?: unknown;
  };
  return [
    ...(testNode.props?.testID ? [testNode.props.testID] : []),
    ...(Array.isArray(testNode.children)
      ? testNode.children.flatMap(collectTestIds)
      : []),
  ];
}

describe('DogDetailScreen', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDogData = mockDog;
    mockCanGoBack = true;
    mockWalks = [];
  });

  it('renders the contacts-style header with dog title and icon-only back action', () => {
    renderWithProviders(<DogDetailScreen />);

    expect(screen.getByTestId('dog-detail-header')).toBeTruthy();
    expect(screen.getByTestId('dog-detail-header-action-row')).toBeTruthy();
    expect(screen.getByTestId('dog-detail-header-large-title-row')).toBeTruthy();
    expect(screen.getAllByText('Buddy')).toHaveLength(1);
    expect(screen.getByLabelText('Dogs')).toBeTruthy();
    expect(screen.getByText('chevron.backward')).toBeTruthy();
    expect(screen.queryByText('Dogs')).toBeNull();
    const backStyle = StyleSheet.flatten(screen.getByTestId('dog-detail-back-button').props.style);
    expect(backStyle.width).toBe(dogContactChrome.circleSize);
    expect(backStyle.height).toBe(dogContactChrome.circleSize);
    expect(backStyle.backgroundColor).toBe(colors.light.background);
    expect(backStyle.borderColor).toBe(colors.light.border);
  });

  it('renders edit button exactly once in screen header for a loaded dog', () => {
    renderWithProviders(<DogDetailScreen />);
    // Regression guard: Edit must appear exactly once (no duplicate from
    // a stray Stack header reintroduction).
    expect(screen.getAllByText('Edit')).toHaveLength(1);
    const editStyle = StyleSheet.flatten(screen.getByTestId('dog-detail-edit-button').props.style);
    expect(editStyle.minWidth).toBe(dogContactChrome.pillMinWidth);
    expect(editStyle.borderRadius).toBe(dogContactChrome.pillRadius);
    expect(editStyle.backgroundColor).toBe(colors.light.background);
  });

  it('navigates to edit screen when edit button is pressed', () => {
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

  it('renders dog goal progress between summary stats and walks', () => {
    mockDogData = {
      ...mockDog,
      walkStats: { totalWalks: 4, totalDistanceM: 3200, totalDurationSec: 5400 },
    };
    mockWalks = [
      {
        id: 'walk-1',
        dogs: [mockDogData],
        status: 'FINISHED',
        distanceM: 1000,
        durationSec: 1200,
        startedAt: '2026-04-20T08:00:00Z',
        endedAt: '2026-04-20T08:20:00Z',
        points: [],
        events: [],
      },
    ];

    const rendered = renderWithProviders(<DogDetailScreen />);

    expect(screen.getByText('Goal progress')).toBeTruthy();
    expect(screen.getByText('20 / 30 min today')).toBeTruthy();

    const sectionOrder = collectTestIds(rendered.toJSON()).filter((testID) =>
      [
        'dog-detail-stats-section',
        'dog-detail-goal-progress-section',
        'dog-detail-walks-section',
      ].includes(testID),
    );

    expect(sectionOrder).toEqual([
      'dog-detail-stats-section',
      'dog-detail-goal-progress-section',
      'dog-detail-walks-section',
    ]);
  });

});
