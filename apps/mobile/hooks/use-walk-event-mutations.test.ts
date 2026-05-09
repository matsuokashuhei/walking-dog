import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type * as ClientModule from '@/lib/graphql/client';
import {
  useRecordWalkEvent,
  useGenerateWalkEventPhotoUploadUrl,
} from './use-walk-event-mutations';

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

describe('useRecordWalkEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls recordWalkEvent and returns WalkEvent', async () => {
    const apiEvent = {
      id: 'event-1',
      walkDogId: 'walk-dog-1',
      event: 'PEE',
      occurredAt: '2026-04-12T10:00:00Z',
      coordinate: { latitude: 35.6812, longitude: 139.7671 },
      createdAt: '2026-04-12T10:00:01Z',
      updatedAt: '2026-04-12T10:00:01Z',
    };
    mockAuthenticatedRequest.mockResolvedValue({ addEvent: apiEvent });

    const { result } = renderHook(() => useRecordWalkEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const data = await result.current.mutateAsync({
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'pee',
        occurredAt: '2026-04-12T10:00:00Z',
        lat: 35.6812,
        lng: 139.7671,
      });
      expect(data).toEqual({
        ...apiEvent,
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'pee',
        lat: 35.6812,
        lng: 139.7671,
        photoUrl: null,
      });
    });

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      {
        input: {
          walkId: 'walk-1',
          dogId: 'dog-1',
          event: 'PEE',
          occurredAt: '2026-04-12T10:00:00Z',
          latitude: 35.6812,
          longitude: 139.7671,
        },
      },
    );
  });

  it('throws without a dog id because addEvent requires dogId', async () => {
    const { result } = renderHook(() => useRecordWalkEvent(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          walkId: 'walk-1',
          eventType: 'pee',
          occurredAt: '2026-04-12T10:05:00Z',
          lat: 35.6812,
          lng: 139.7671,
        });
      }),
    ).rejects.toThrow('dogId is required');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('throws for photo events because photos use takePhoto, not addEvent', async () => {
    const { result } = renderHook(() => useRecordWalkEvent(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          walkId: 'walk-1',
          dogId: 'dog-1',
          eventType: 'photo',
          occurredAt: '2026-04-12T10:05:00Z',
          lat: 35.6812,
          lng: 139.7671,
        });
      }),
    ).rejects.toThrow('Unsupported walk event type');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('throws without coordinates because addEvent requires a coordinate', async () => {
    const { result } = renderHook(() => useRecordWalkEvent(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          walkId: 'walk-1',
          dogId: 'dog-1',
          eventType: 'pee',
          occurredAt: '2026-04-12T10:05:00Z',
        });
      }),
    ).rejects.toThrow('latitude and longitude are required');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });

  it('throws when API returns error', async () => {
    mockAuthenticatedRequest.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useRecordWalkEvent(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          walkId: 'walk-1',
          dogId: 'dog-1',
          eventType: 'pee',
          occurredAt: '2026-04-12T10:00:00Z',
          lat: 35.6812,
          lng: 139.7671,
        });
      }),
    ).rejects.toThrow('Unauthorized');
  });
});

describe('useGenerateWalkEventPhotoUploadUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws without making an API call because presigned URLs are unsupported', async () => {
    const { result } = renderHook(() => useGenerateWalkEventPhotoUploadUrl(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ walkId: 'walk-1', contentType: 'image/jpeg' });
      }),
    ).rejects.toThrow('not supported');
    expect(mockAuthenticatedRequest).not.toHaveBeenCalled();
  });
});
