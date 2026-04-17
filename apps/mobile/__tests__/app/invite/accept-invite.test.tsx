import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import AcceptInviteScreen from '../../../app/invite/[token]';

jest.mock('expo-router', () => {
  const router = { replace: jest.fn(), back: jest.fn() };
  return {
    useLocalSearchParams: () => ({ token: 'test-token' }),
    useRouter: () => router,
    __router: router,
  };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __router } = require('expo-router') as {
  __router: { replace: jest.Mock; back: jest.Mock };
};
const mockReplace = __router.replace;

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/hooks/use-accept-invitation', () => {
  const mutation = { mutateAsync: jest.fn(), isPending: false };
  return {
    useAcceptInvitation: () => mutation,
    __mutation: mutation,
  };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mutation } = require('@/hooks/use-accept-invitation') as {
  __mutation: { mutateAsync: jest.Mock; isPending: boolean };
};
const mockMutateAsync = __mutation.mutateAsync;

let mockIsAuthenticated = true;
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
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

  it('shows expired error when API returns expired message', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Invitation has expired'));
    renderWithProviders(<AcceptInviteScreen />);

    await waitFor(() => {
      expect(screen.getByText('This invitation has expired')).toBeTruthy();
    });
  });

  it('shows already used error when API returns already used message', async () => {
    mockMutateAsync.mockRejectedValue(
      new Error('Invitation has already been used'),
    );
    renderWithProviders(<AcceptInviteScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('This invitation has already been used'),
      ).toBeTruthy();
    });
  });

  it('shows already member error when API returns member message', async () => {
    mockMutateAsync.mockRejectedValue(
      new Error('User is already a member'),
    );
    renderWithProviders(<AcceptInviteScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('You are already a member of this group'),
      ).toBeTruthy();
    });
  });

  it('shows generic error on unknown failure', async () => {
    mockMutateAsync.mockRejectedValue(new Error('unknown error'));
    renderWithProviders(<AcceptInviteScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to accept invitation')).toBeTruthy();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockIsAuthenticated = false;
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
      mockIsAuthenticated = true;
    });

    it('saves the pending invite token and redirects to login', async () => {
      renderWithProviders(<AcceptInviteScreen />);

      await waitFor(() => {
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          'pending_invite_token',
          'test-token',
        );
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
      });
    });
  });
});
