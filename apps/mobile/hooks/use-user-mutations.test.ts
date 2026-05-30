import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type * as ClientModule from '@/lib/graphql/client';
import { useUpdateUser } from './use-user-mutations';

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

const apiUser = {
  id: 'user-1',
  name: 'Mio Tanaka',
  avatar: 'https://example.com/mio.jpg',
  createdAt: '2024-03-10T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  dogs: [],
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

describe('useUpdateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedRequest.mockResolvedValue({ updateUser: apiUser });
    mockAuthenticatedMultipartRequest.mockResolvedValue({ updateUser: apiUser });
    mockInvalidateUserQueries.mockResolvedValue(undefined);
  });

  it('uses the JSON GraphQL request path when avatarFile is omitted', async () => {
    const { result, unmount } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        input: {
          name: 'Mio Tanaka',
        },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(expect.any(String), {
      input: {
        name: 'Mio Tanaka',
      },
    });
    expect(mockAuthenticatedMultipartRequest).not.toHaveBeenCalled();
    unmount();
  });

  it('uses the multipart GraphQL request path when avatarFile is provided', async () => {
    const avatarFile = {
      uri: 'file:///mio.png',
      name: 'mio.png',
      type: 'image/png',
    };
    const { result, unmount } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        input: {
          name: 'Mio Tanaka',
          avatarFile,
        },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAuthenticatedMultipartRequest).toHaveBeenCalledWith(
      expect.any(String),
      {
        input: {
          name: 'Mio Tanaka',
          avatar: null,
        },
      },
      { 'variables.input.avatar': avatarFile },
    );
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
    unmount();
  });
});
