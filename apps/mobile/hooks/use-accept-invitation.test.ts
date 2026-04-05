import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAcceptInvitation } from './use-accept-invitation';
import * as client from '@/lib/graphql/client';

jest.mock('@/lib/graphql/client');

const mockAuthenticatedRequest = client.authenticatedRequest as jest.MockedFunction<
  typeof client.authenticatedRequest
>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAcceptInvitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls acceptDogInvitation with token and returns dog', async () => {
    const dog = { id: 'dog-1', name: 'Buddy' };
    mockAuthenticatedRequest.mockResolvedValue({ acceptDogInvitation: dog });

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const data = await result.current.mutateAsync('abc123');
      expect(data).toEqual(dog);
    });

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      { token: 'abc123' },
    );
  });

  it('throws on error', async () => {
    mockAuthenticatedRequest.mockRejectedValue(new Error('expired'));

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync('expired-token');
      }),
    ).rejects.toThrow('expired');
  });
});
