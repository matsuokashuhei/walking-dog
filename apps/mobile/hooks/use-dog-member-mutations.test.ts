import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useGenerateInvitation,
  useRemoveMember,
  useLeaveDog,
} from './use-dog-member-mutations';
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

describe('useGenerateInvitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls generateDogInvitation and returns invitation', async () => {
    const invitation = { id: 'inv-1', token: 'abc123', expiresAt: '2026-04-05T00:00:00Z' };
    mockAuthenticatedRequest.mockResolvedValue({ generateDogInvitation: invitation });

    const { result } = renderHook(() => useGenerateInvitation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const data = await result.current.mutateAsync('dog-1');
      expect(data).toEqual(invitation);
    });
  });

  it('throws when API returns error', async () => {
    mockAuthenticatedRequest.mockRejectedValue(new Error('Not owner'));

    const { result } = renderHook(() => useGenerateInvitation(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync('dog-1');
      }),
    ).rejects.toThrow('Not owner');
  });
});

describe('useRemoveMember', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls removeDogMember with dogId and userId', async () => {
    mockAuthenticatedRequest.mockResolvedValue({ removeDogMember: true });

    const { result } = renderHook(() => useRemoveMember(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ dogId: 'dog-1', userId: 'user-2' });
    });

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      { dogId: 'dog-1', userId: 'user-2' },
    );
  });

  it('throws when API returns error', async () => {
    mockAuthenticatedRequest.mockRejectedValue(new Error('Not owner'));

    const { result } = renderHook(() => useRemoveMember(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ dogId: 'dog-1', userId: 'user-2' });
      }),
    ).rejects.toThrow('Not owner');
  });
});

describe('useLeaveDog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls leaveDog with dogId', async () => {
    mockAuthenticatedRequest.mockResolvedValue({ leaveDog: true });

    const { result } = renderHook(() => useLeaveDog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('dog-1');
    });

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      { dogId: 'dog-1' },
    );
  });

  it('throws when owner tries to leave', async () => {
    mockAuthenticatedRequest.mockRejectedValue(
      new Error('Owners cannot leave their dog'),
    );

    const { result } = renderHook(() => useLeaveDog(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync('dog-1');
      }),
    ).rejects.toThrow('Owners cannot leave their dog');
  });
});
