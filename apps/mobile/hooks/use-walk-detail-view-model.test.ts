import { renderHook } from '@testing-library/react-native';
import { useWalkDetailViewModel } from './use-walk-detail-view-model';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';
import type { Walk } from '@/types/graphql';

function makeWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: 'w-1',
    dogs: [
      {
        id: 'd-1',
        name: 'Rex',
        breed: null,
        gender: null,
        birthDate: null,
        photoUrl: null,
        createdAt: '',
      },
    ],
    status: 'FINISHED',
    distanceM: 2500,
    durationSec: 1800,
    startedAt: '2026-04-01T09:00:00Z',
    endedAt: '2026-04-01T09:30:00Z',
    points: [
      { lat: 35.0, lng: 139.0, recordedAt: '' },
      { lat: 35.1, lng: 139.1, recordedAt: '' },
      { lat: 35.2, lng: 139.2, recordedAt: '' },
    ],
    events: [],
    ...overrides,
  };
}

describe('useWalkDetailViewModel', () => {
  it('returns null when walk is undefined', () => {
    const { result } = renderHook(() => useWalkDetailViewModel(undefined));
    expect(result.current).toBeNull();
  });

  it('maps points to coordinates', () => {
    const { result } = renderHook(() => useWalkDetailViewModel(makeWalk()));
    expect(result.current!.coordinates).toEqual([
      { latitude: 35.0, longitude: 139.0 },
      { latitude: 35.1, longitude: 139.1 },
      { latitude: 35.2, longitude: 139.2 },
    ]);
  });

  it('rounds durationSec to minutes', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ durationSec: 1850 })),
    );
    expect(result.current!.durationMin).toBe(31);
  });

  it('returns 0 duration when durationSec is null', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ durationSec: null })),
    );
    expect(result.current!.durationMin).toBe(0);
  });

  it('formats distance in kilometers with 2 decimals', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ distanceM: 1234 })),
    );
    expect(result.current!.distanceKm).toBe('1.23');
  });

  it('returns "0" distance when distanceM is null', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ distanceM: null })),
    );
    expect(result.current!.distanceKm).toBe('0');
  });

  it('joins dog names with comma', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(
        makeWalk({
          dogs: [
            {
              id: 'a',
              name: 'Rex',
              breed: null,
              gender: null,
              birthDate: null,
              photoUrl: null,
              createdAt: '',
            },
            {
              id: 'b',
              name: 'Buddy',
              breed: null,
              gender: null,
              birthDate: null,
              photoUrl: null,
              createdAt: '',
            },
          ],
        }),
      ),
    );
    expect(result.current!.dogNames).toBe('Rex, Buddy');
  });

  it('returns null endTime when walk.endedAt is null', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ endedAt: null })),
    );
    expect(result.current!.endTime).toBeNull();
  });

  it('midpoint is the middle coordinate when points exist', () => {
    const { result } = renderHook(() => useWalkDetailViewModel(makeWalk()));
    expect(result.current!.midpoint).toEqual({ latitude: 35.1, longitude: 139.1 });
  });

  it('midpoint falls back to Tokyo Station when there are no points', () => {
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ points: [] })),
    );
    expect(result.current!.midpoint).toEqual(TOKYO_STATION_COORDINATE);
  });

  it('passes through walk.events', () => {
    const event = {
      id: 'e1',
      walkId: 'w-1',
      dogId: null,
      eventType: 'pee' as const,
      occurredAt: '',
      lat: null,
      lng: null,
      photoUrl: null,
    };
    const { result } = renderHook(() =>
      useWalkDetailViewModel(makeWalk({ events: [event] })),
    );
    expect(result.current!.events).toEqual([event]);
  });
});
