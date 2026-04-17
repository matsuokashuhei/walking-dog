import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAcceptInviteFlow } from './use-accept-invite-flow';
import * as isAuth from './use-is-authenticated';
import * as acceptInvitation from './use-accept-invitation';
import * as pending from '@/lib/auth/pending-invite-token';
import * as gqlErrors from '@/lib/graphql/errors';

jest.mock('./use-is-authenticated');
jest.mock('./use-accept-invitation');
jest.mock('@/lib/auth/pending-invite-token', () => ({
  savePendingInviteToken: jest.fn(),
}));
jest.mock('@/lib/graphql/errors', () => ({
  extractGraphQLErrorMessage: jest.fn(),
}));
jest.mock('expo-router', () => {
  const router = { replace: jest.fn() };
  return {
    useRouter: () => router,
    __router: router,
  };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockReplace = (require('expo-router') as { __router: { replace: jest.Mock } }).__router
  .replace;

const mockMutateAsync = jest.fn();

function setupMocks(opts: { isAuthenticated: boolean }) {
  (isAuth.useIsAuthenticated as jest.Mock).mockReturnValue(opts.isAuthenticated);
  (acceptInvitation.useAcceptInvitation as jest.Mock).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (pending.savePendingInviteToken as jest.Mock).mockResolvedValue(undefined);
  (gqlErrors.extractGraphQLErrorMessage as jest.Mock).mockReturnValue(null);
});

describe('useAcceptInviteFlow — unauthenticated', () => {
  beforeEach(() => setupMocks({ isAuthenticated: false }));

  it('on mount with token, saves token and redirects to login', async () => {
    renderHook(() => useAcceptInviteFlow('tok-1'));

    await waitFor(() => {
      expect(pending.savePendingInviteToken).toHaveBeenCalledWith('tok-1');
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('when savePendingInviteToken fails, transitions to error with saveFailed key', async () => {
    (pending.savePendingInviteToken as jest.Mock).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useAcceptInviteFlow('tok-1'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.errorKey).toBe('invite.error.saveFailed');
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not attempt anything when token is undefined', async () => {
    renderHook(() => useAcceptInviteFlow(undefined));
    await new Promise((r) => setTimeout(r, 10));
    expect(pending.savePendingInviteToken).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

describe('useAcceptInviteFlow — authenticated', () => {
  beforeEach(() => setupMocks({ isAuthenticated: true }));

  it('on mount with token, auto-accepts and transitions to success with dogName', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'dog-1', name: 'Rex' });

    const { result } = renderHook(() => useAcceptInviteFlow('tok-1'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('tok-1');
      expect(result.current.status).toBe('success');
      expect(result.current.dogName).toBe('Rex');
    });
  });

  it('on accept failure, transitions to error with mapped key', async () => {
    mockMutateAsync.mockRejectedValue(new Error('graphql err'));
    (gqlErrors.extractGraphQLErrorMessage as jest.Mock).mockReturnValue('Invitation has expired');

    const { result } = renderHook(() => useAcceptInviteFlow('tok-1'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.errorKey).toBe('invite.error.expired');
    });
  });

  it('on unknown accept failure, uses generic key', async () => {
    mockMutateAsync.mockRejectedValue(new Error('wat'));
    (gqlErrors.extractGraphQLErrorMessage as jest.Mock).mockReturnValue('random thing');

    const { result } = renderHook(() => useAcceptInviteFlow('tok-1'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.errorKey).toBe('invite.error.generic');
    });
  });

  it('does not redirect to login', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'd', name: 'X' });
    renderHook(() => useAcceptInviteFlow('tok-1'));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('accept() called explicitly re-runs the mutation', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'd', name: 'X' });
    const { result } = renderHook(() => useAcceptInviteFlow('tok-1'));
    await waitFor(() => expect(result.current.status).toBe('success'));

    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue({ id: 'd2', name: 'Y' });
    await act(async () => {
      await result.current.accept();
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(result.current.dogName).toBe('Y');
  });
});

describe('useAcceptInviteFlow — initial state', () => {
  beforeEach(() => setupMocks({ isAuthenticated: false }));

  it('starts with status=idle, dogName=null, errorKey=null', () => {
    const { result } = renderHook(() => useAcceptInviteFlow(undefined));
    expect(result.current.status).toBe('idle');
    expect(result.current.dogName).toBeNull();
    expect(result.current.errorKey).toBeNull();
  });
});
