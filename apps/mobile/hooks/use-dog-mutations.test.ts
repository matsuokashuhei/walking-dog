import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type * as ClientModule from '@/lib/graphql/client';
import { useUpdateDog } from './use-dog-mutations';

jest.mock('@/lib/graphql/client', () => ({
  authenticatedRequest: jest.fn(),
  authenticatedMultipartRequest: jest.fn(),
}));

const {
  authenticatedRequest,
  authenticatedMultipartRequest,
} = require('@/lib/graphql/client') as typeof ClientModule;
const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<
  typeof authenticatedRequest
>;
const mockAuthenticatedMultipartRequest =
  authenticatedMultipartRequest as jest.MockedFunction<
    typeof authenticatedMultipartRequest
  >;
const mockInvalidateUserQueries = jest.fn();

jest.mock('./use-invalidate-user-queries', () => ({
  useInvalidateUserQueries: () => mockInvalidateUserQueries,
}));

const apiDog = {
  id: 'dog-1',
  name: 'Buddy',
  breed: 'Golden Retriever',
  gender: 'MALE' as const,
  avatar: 'https://example.com/avatar.jpg',
  birthday: null,
  walkGoal: {
    id: 'goal-1',
    dogId: 'dog-1',
    walkAmount: { minutes: 45, cycleDays: 1 },
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

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

describe('useUpdateDog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedRequest.mockResolvedValue({ updateDog: apiDog });
    mockAuthenticatedMultipartRequest.mockResolvedValue({ updateDog: apiDog });
    mockInvalidateUserQueries.mockResolvedValue(undefined);
  });

  it('uses the JSON GraphQL request path when avatarFile is omitted', async () => {
    const { result, unmount } = renderHook(() => useUpdateDog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'dog-1',
        input: {
          name: 'Buddy',
          breed: 'Golden Retriever',
          gender: 'male',
          birthday: null,
          dailyGoalMinutes: 45,
        },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(expect.any(String), {
      input: {
        id: 'dog-1',
        name: 'Buddy',
        breed: 'Golden Retriever',
        gender: 'MALE',
        birthday: null,
        dailyGoalMinutes: 45,
      },
    });
    expect(mockAuthenticatedMultipartRequest).not.toHaveBeenCalled();
    unmount();
  });

  it('uses the multipart GraphQL request path when avatarFile is provided', async () => {
    const avatarFile = {
      uri: 'file:///avatar.png',
      name: 'avatar.png',
      type: 'image/png',
    };
    const { result, unmount } = renderHook(() => useUpdateDog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'dog-1',
        input: {
          name: 'Buddy',
          breed: 'Golden Retriever',
          gender: 'female',
          birthday: null,
          dailyGoalMinutes: 60,
          avatarFile,
        },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAuthenticatedMultipartRequest).toHaveBeenCalledWith(
      expect.any(String),
      {
        input: {
          id: 'dog-1',
          name: 'Buddy',
          breed: 'Golden Retriever',
          gender: 'FEMALE',
          birthday: null,
          dailyGoalMinutes: 60,
          avatar: null,
        },
      },
      { 'variables.input.avatar': avatarFile },
    );
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
    unmount();
  });
});
