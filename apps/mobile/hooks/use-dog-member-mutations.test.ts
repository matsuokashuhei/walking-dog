import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type * as ClientModule from '@/lib/graphql/client';
import {
  useGenerateInvitation,
  useRemoveMember,
  useLeaveDog,
} from './use-dog-member-mutations';

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

describe('unsupported dog member mutations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not call the API for invitation generation', async () => {
    const { result } = renderHook(() => useGenerateInvitation(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('dog-1');
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('does not call the API for member removal', async () => {
    const { result } = renderHook(() => useRemoveMember(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ dogId: 'dog-1', userId: 'user-2' });
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('does not call the API for leaving a dog', async () => {
    const { result } = renderHook(() => useLeaveDog(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('dog-1');
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });
});
