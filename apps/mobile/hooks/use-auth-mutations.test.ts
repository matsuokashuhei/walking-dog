import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  changeEmail,
  changePassword,
  confirmEmailChange,
} from '@/lib/auth/api';
import {
  useChangeEmail,
  useChangePassword,
  useConfirmEmailChange,
} from './use-auth-mutations';

jest.mock('@/lib/auth/api', () => ({
  changeEmail: jest.fn(),
  confirmEmailChange: jest.fn(),
  changePassword: jest.fn(),
}));

const mockChangeEmail = changeEmail as jest.MockedFunction<typeof changeEmail>;
const mockConfirmEmailChange = confirmEmailChange as jest.MockedFunction<
  typeof confirmEmailChange
>;
const mockChangePassword = changePassword as jest.MockedFunction<typeof changePassword>;

function createWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('auth account mutation hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChangeEmail.mockResolvedValue(true);
    mockConfirmEmailChange.mockResolvedValue(true);
    mockChangePassword.mockResolvedValue(true);
  });

  it('submits changeEmail through the auth API wrapper', async () => {
    const { result, unmount } = renderHook(() => useChangeEmail(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ newEmail: 'mio.new@example.com' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockChangeEmail).toHaveBeenCalledWith('mio.new@example.com');
    unmount();
  });

  it('submits confirmEmailChange through the auth API wrapper', async () => {
    const { result, unmount } = renderHook(() => useConfirmEmailChange(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ code: '123456' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockConfirmEmailChange).toHaveBeenCalledWith('123456');
    unmount();
  });

  it('submits changePassword through the auth API wrapper', async () => {
    const { result, unmount } = renderHook(() => useChangePassword(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        oldPassword: 'oldPassword1',
        newPassword: 'newpass1',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockChangePassword).toHaveBeenCalledWith('oldPassword1', 'newpass1');
    unmount();
  });
});
