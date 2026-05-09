import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type * as ClientModule from '@/lib/graphql/client';
import { useRecordEncounter, useUpdateEncounterDuration } from './use-encounter-mutations';

jest.mock('@/lib/graphql/client', () => ({
  authenticatedRequest: jest.fn(),
}));

const { authenticatedRequest } = require('@/lib/graphql/client') as typeof ClientModule;
const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<
  typeof authenticatedRequest
>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('unsupported encounter mutations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not call the API for encounter recording', async () => {
    const { result } = renderHook(() => useRecordEncounter(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ myWalkId: 'w-1', theirWalkId: 'w-2' });
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('does not call the API for encounter duration updates', async () => {
    const { result } = renderHook(() => useUpdateEncounterDuration(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          myWalkId: 'w-1',
          theirWalkId: 'w-2',
          durationSec: 42,
        });
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });
});
