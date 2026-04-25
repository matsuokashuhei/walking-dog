import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useWalkEventRecorder } from './use-walk-event-recorder';
import { PhotoUploadError } from './use-photo-upload';
import * as walkEventMutations from './use-walk-event-mutations';
import * as photoUpload from './use-photo-upload';
import * as mutationWithAlert from './use-mutation-with-alert';
import * as eventOutbox from '@/lib/walk/event-outbox';
import * as flushOutboxHook from './use-flush-walk-event-outbox';

jest.mock('./use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
}));

jest.mock('./use-photo-upload', () => {
  const actual = jest.requireActual('./use-photo-upload');
  return { ...actual, usePhotoUpload: jest.fn() };
});

jest.mock('./use-mutation-with-alert', () => ({
  useMutationWithAlert: jest.fn(),
}));

jest.mock('@/lib/walk/event-outbox', () => ({
  enqueuePendingEvent: jest.fn(),
}));

jest.mock('./use-flush-walk-event-outbox', () => ({
  useFlushWalkEventOutbox: jest.fn(),
}));

const mockRecordWalkEvent = jest.fn();
const mockUploadPhoto = jest.fn();
const runWithAlertMock = jest.fn();
const mockFlushOutbox = jest.fn();

let lastResolvedErrorKey: string | null;

beforeEach(() => {
  jest.clearAllMocks();
  lastResolvedErrorKey = null;

  (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
    mutateAsync: mockRecordWalkEvent,
    isPending: false,
  });

  (photoUpload.usePhotoUpload as jest.Mock).mockReturnValue({
    uploadPhoto: mockUploadPhoto,
    isPending: false,
  });

  runWithAlertMock.mockImplementation(
    async (
      fn: () => Promise<unknown>,
      errorMessage: string | ((error: unknown) => string),
    ) => {
      try {
        return await fn();
      } catch (error) {
        lastResolvedErrorKey =
          typeof errorMessage === 'function' ? errorMessage(error) : errorMessage;
        return null;
      }
    },
  );

  (mutationWithAlert.useMutationWithAlert as jest.Mock).mockReturnValue(runWithAlertMock);

  mockFlushOutbox.mockResolvedValue({ flushed: 0, remaining: 0 });
  (flushOutboxHook.useFlushWalkEventOutbox as jest.Mock).mockReturnValue(mockFlushOutbox);
  (eventOutbox.enqueuePendingEvent as jest.Mock).mockResolvedValue(undefined);
});

describe('useWalkEventRecorder', () => {
  it('records pee events with GPS and alert context', async () => {
    const event = { id: 'event-1', eventType: 'pee' };
    mockRecordWalkEvent.mockResolvedValue(event);

    const { result } = renderHook(() =>
      useWalkEventRecorder({
        walkId: 'walk-1',
        latestPoint: { lat: 35.68, lng: 139.76 },
        source: 'WalkEventActions',
      }),
    );

    let recorded: unknown;
    await act(async () => {
      recorded = await result.current.recordEvent('pee', 'dog-1');
    });

    expect(runWithAlertMock).toHaveBeenCalledWith(
      expect.any(Function),
      'walk.event.recordError',
      {
        action: 'recordWalkEvent',
        dogId: 'dog-1',
        eventType: 'pee',
        source: 'WalkEventActions',
      },
    );
    expect(mockRecordWalkEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'pee',
        lat: 35.68,
        lng: 139.76,
      }),
    );
    expect(recorded).toEqual(event);
  });

  it('omits GPS coordinates when there is no latest point', async () => {
    mockRecordWalkEvent.mockResolvedValue({ id: 'event-2', eventType: 'poo' });

    const { result } = renderHook(() => useWalkEventRecorder({ walkId: 'walk-1' }));

    await act(async () => {
      await result.current.recordEvent('poo', 'dog-2');
    });

    expect(mockRecordWalkEvent).toHaveBeenCalledWith(
      expect.not.objectContaining({ lat: expect.anything(), lng: expect.anything() }),
    );
  });

  it('maps photo upload failures to a phase-specific alert key', async () => {
    mockUploadPhoto.mockRejectedValue(new PhotoUploadError('upload', new Error('boom')));

    const { result } = renderHook(() =>
      useWalkEventRecorder({ walkId: 'walk-1', source: 'WalkEventActions' }),
    );

    let recorded: unknown;
    await act(async () => {
      recorded = await result.current.recordPhoto({
        dogId: 'dog-1',
        asset: { uri: 'file:///photo.jpg', mimeType: 'image/jpeg' },
      });
    });

    expect(runWithAlertMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        action: 'uploadWalkPhoto',
        dogId: 'dog-1',
        source: 'WalkEventActions',
      },
    );
    expect(recorded).toBeNull();
    expect(lastResolvedErrorKey).toBe('walk.event.photoUploadError');
  });

  it('returns null without running mutations when no walk is active', async () => {
    const { result } = renderHook(() => useWalkEventRecorder({ walkId: null }));

    let recorded: unknown;
    await act(async () => {
      recorded = await result.current.recordEvent('pee', 'dog-1');
    });

    expect(recorded).toBeNull();
    expect(runWithAlertMock).not.toHaveBeenCalled();
    expect(mockRecordWalkEvent).not.toHaveBeenCalled();
  });

  it('attempts an opportunistic outbox flush when the recorder mounts', async () => {
    renderHook(() => useWalkEventRecorder({ walkId: 'walk-1' }));
    await waitFor(() => {
      expect(mockFlushOutbox).toHaveBeenCalled();
    });
  });

  it('enqueues the failed event into the outbox when the mutation rejects, and returns null', async () => {
    mockRecordWalkEvent.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() =>
      useWalkEventRecorder({
        walkId: 'walk-1',
        latestPoint: { lat: 35.68, lng: 139.76 },
      }),
    );

    let recorded: unknown;
    await act(async () => {
      recorded = await result.current.recordEvent('pee', 'dog-1');
    });

    expect(recorded).toBeNull();
    expect(eventOutbox.enqueuePendingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'pee',
        lat: 35.68,
        lng: 139.76,
        occurredAt: expect.any(String),
      }),
    );
  });

  it('does not enqueue when the mutation succeeds, and triggers an opportunistic flush', async () => {
    mockRecordWalkEvent.mockResolvedValue({ id: 'event-1', eventType: 'pee' });
    mockFlushOutbox.mockClear();

    const { result } = renderHook(() => useWalkEventRecorder({ walkId: 'walk-1' }));
    await waitFor(() => {
      expect(mockFlushOutbox).toHaveBeenCalledTimes(1);
    });
    mockFlushOutbox.mockClear();

    await act(async () => {
      await result.current.recordEvent('pee', 'dog-1');
    });

    expect(eventOutbox.enqueuePendingEvent).not.toHaveBeenCalled();
    expect(mockFlushOutbox).toHaveBeenCalledTimes(1);
  });

  it('surfaces pending state from either event mutation or photo upload', () => {
    (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
      mutateAsync: mockRecordWalkEvent,
      isPending: true,
    });
    (photoUpload.usePhotoUpload as jest.Mock).mockReturnValue({
      uploadPhoto: mockUploadPhoto,
      isPending: false,
    });

    const eventPending = renderHook(() => useWalkEventRecorder({ walkId: 'walk-1' }));
    expect(eventPending.result.current.isPending).toBe(true);

    (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
      mutateAsync: mockRecordWalkEvent,
      isPending: false,
    });
    (photoUpload.usePhotoUpload as jest.Mock).mockReturnValue({
      uploadPhoto: mockUploadPhoto,
      isPending: true,
    });

    const photoPending = renderHook(() => useWalkEventRecorder({ walkId: 'walk-1' }));
    expect(photoPending.result.current.isPending).toBe(true);
  });
});
