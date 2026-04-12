import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useRecordWalkEvent,
  useGenerateWalkEventPhotoUploadUrl,
} from './use-walk-event-mutations';
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

describe('useRecordWalkEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls recordWalkEvent and returns WalkEvent', async () => {
    const event = {
      id: 'event-1',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-04-12T10:00:00Z',
      lat: 35.6812,
      lng: 139.7671,
      photoUrl: null,
    };
    mockAuthenticatedRequest.mockResolvedValue({ recordWalkEvent: event });

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
      expect(data).toEqual(event);
    });
  });

  it('records photo event with photoKey', async () => {
    const event = {
      id: 'event-2',
      walkId: 'walk-1',
      dogId: null,
      eventType: 'photo',
      occurredAt: '2026-04-12T10:05:00Z',
      lat: null,
      lng: null,
      photoUrl: 'https://cdn.example.com/walks/walk-1/photo.jpg',
    };
    mockAuthenticatedRequest.mockResolvedValue({ recordWalkEvent: event });

    const { result } = renderHook(() => useRecordWalkEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const data = await result.current.mutateAsync({
        walkId: 'walk-1',
        eventType: 'photo',
        occurredAt: '2026-04-12T10:05:00Z',
        photoKey: 'walks/walk-1/abc123.jpg',
      });
      expect(data.eventType).toBe('photo');
      expect(data.photoUrl).toBeTruthy();
    });

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      { input: expect.objectContaining({ photoKey: 'walks/walk-1/abc123.jpg' }) },
    );
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
          eventType: 'pee',
          occurredAt: '2026-04-12T10:00:00Z',
        });
      }),
    ).rejects.toThrow('Unauthorized');
  });
});

describe('useGenerateWalkEventPhotoUploadUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls generateWalkEventPhotoUploadUrl and returns presigned URL', async () => {
    const presignedUrl = {
      url: 'https://s3.example.com/presigned',
      key: 'walks/walk-1/abc123.jpg',
      expiresAt: '2026-04-12T10:15:00Z',
    };
    mockAuthenticatedRequest.mockResolvedValue({
      generateWalkEventPhotoUploadUrl: presignedUrl,
    });

    const { result } = renderHook(() => useGenerateWalkEventPhotoUploadUrl(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const data = await result.current.mutateAsync({
        walkId: 'walk-1',
        contentType: 'image/jpeg',
      });
      expect(data).toEqual(presignedUrl);
    });

    expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      { walkId: 'walk-1', contentType: 'image/jpeg' },
    );
  });

  it('throws when API returns error', async () => {
    mockAuthenticatedRequest.mockRejectedValue(new Error('Walk not found'));

    const { result } = renderHook(() => useGenerateWalkEventPhotoUploadUrl(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ walkId: 'walk-1', contentType: 'image/jpeg' });
      }),
    ).rejects.toThrow('Walk not found');
  });
});
