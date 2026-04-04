import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AcceptInviteScreen from '../[token]';

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ token: 'test-token' }),
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockMutateAsync = jest.fn();
jest.mock('@/hooks/use-accept-invitation', () => ({
  useAcceptInvitation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
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

describe('AcceptInviteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockMutateAsync.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<AcceptInviteScreen />);
    expect(screen.getByText('Accepting invitation...')).toBeTruthy();
  });

  it('shows success state after accepting', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'dog-1', name: 'Buddy' });
    renderWithProviders(<AcceptInviteScreen />);

    await waitFor(() => {
      expect(screen.getByText('You have joined Buddy!')).toBeTruthy();
    });
  });

  it('shows error state on failure', async () => {
    mockMutateAsync.mockRejectedValue(new Error('expired'));
    renderWithProviders(<AcceptInviteScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to accept invitation')).toBeTruthy();
    });
  });
});
