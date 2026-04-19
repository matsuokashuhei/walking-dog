import { useMemo } from 'react';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';
import { formatClockTime, formatDistanceParts, formatShortDate } from '@/lib/walk/format';
import type { Walk, WalkEvent } from '@/types/graphql';

export interface WalkDetailViewModel {
  coordinates: { latitude: number; longitude: number }[];
  events: WalkEvent[];
  durationMin: number;
  distanceKm: string;
  date: string;
  dogNames: string;
  startTime: string;
  endTime: string | null;
  midpoint: { latitude: number; longitude: number };
}

export function useWalkDetailViewModel(walk: Walk | null | undefined): WalkDetailViewModel | null {
  return useMemo(() => {
    if (!walk) return null;

    const coordinates = (walk.points ?? []).map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
    const events = walk.events ?? [];
    const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
    const distanceKm = formatDistanceParts(walk.distanceM ?? 0, 'km', 2).value;
    const date = formatShortDate(walk.startedAt);
    const dogNames = walk.dogs.map((d) => d.name).join(', ');
    const startTime = formatClockTime(walk.startedAt);
    const endTime = walk.endedAt ? formatClockTime(walk.endedAt) : null;
    const midpoint =
      coordinates.length > 0
        ? coordinates[Math.floor(coordinates.length / 2)]
        : TOKYO_STATION_COORDINATE;

    return {
      coordinates,
      events,
      durationMin,
      distanceKm,
      date,
      dogNames,
      startTime,
      endTime,
      midpoint,
    };
  }, [walk]);
}
