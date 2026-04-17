import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useInvalidateUserQueries } from './use-invalidate-user-queries';
import { meKeys, dogKeys } from '@/lib/graphql/keys';

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useInvalidateUserQueries', () => {
  it('invalidates meKeys.all and dogKeys.all when invoked', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateUserQueries(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current();
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: meKeys.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: dogKeys.all });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('returns a stable function across renders', () => {
    const queryClient = new QueryClient();

    const { result, rerender } = renderHook(() => useInvalidateUserQueries(), {
      wrapper: createWrapper(queryClient),
    });

    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });
});
