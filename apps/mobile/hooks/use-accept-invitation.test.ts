import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type * as ClientModule from '@/lib/graphql/client';
import { useAcceptInvitation } from './use-accept-invitation';

jest.mock('@/lib/graphql/client', () => ({
  authenticatedRequest: jest.fn(),
}));

const { authenticatedRequest } = require('@/lib/graphql/client') as typeof ClientModule;
const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<
  typeof authenticatedRequest
>;

function createWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAcceptInvitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not call the API because invitations are unsupported', async () => {
    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync('abc123');
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });
});
