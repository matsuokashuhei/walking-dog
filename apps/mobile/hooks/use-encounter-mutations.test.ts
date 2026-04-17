import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useRecordEncounter, useUpdateEncounterDuration } from './use-encounter-mutations';
import * as client from '@/lib/graphql/client';
import type { Encounter } from '@/types/graphql';

jest.mock('@/lib/graphql/client');
const mockAuthenticatedRequest = client.authenticatedRequest as jest.MockedFunction<
  typeof client.authenticatedRequest
>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRecordEncounter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns Encounter[] (unwrapped from recordEncounter field)', async () => {
    const encounters: Encounter[] = [
      { id: 'enc-1', myWalkId: 'w-1', theirWalkId: 'w-2', durationSec: null, startedAt: null } as unknown as Encounter,
    ];
    mockAuthenticatedRequest.mockResolvedValue({ recordEncounter: encounters });

    const { result } = renderHook(() => useRecordEncounter(), { wrapper: createWrapper() });

    await act(async () => {
      const data = await result.current.mutateAsync({ myWalkId: 'w-1', theirWalkId: 'w-2' });
      expect(data).toEqual(encounters);
    });
  });
});

describe('useUpdateEncounterDuration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns boolean (unwrapped from updateEncounterDuration field)', async () => {
    mockAuthenticatedRequest.mockResolvedValue({ updateEncounterDuration: true });

    const { result } = renderHook(() => useUpdateEncounterDuration(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const data = await result.current.mutateAsync({
        myWalkId: 'w-1',
        theirWalkId: 'w-2',
        durationSec: 42,
      });
      expect(data).toBe(true);
    });
  });
});
