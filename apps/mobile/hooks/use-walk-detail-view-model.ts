import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TOKYO_STATION_COORDINATE } from '@/lib/walk/constants';
import {
  formatClockTime,
  formatDistanceParts,
  formatDuration,
  formatPace,
  formatShortDate,
} from '@/lib/walk/format';
import type { Walk, WalkEvent } from '@/types/graphql';

// Walk 詳細画面に必要な表示用データをまとめた ViewModel です。
export interface WalkDetailViewModel {
  coordinates: { latitude: number; longitude: number }[];
  events: WalkEvent[];
  durationMin: number;
  distanceKm: string;
  distanceDisplay: { value: string; unit: string };
  durationDisplay: string;
  paceDisplay: { value: string; unit: string };
  date: string;
  dogNames: string;
  startTime: string;
  endTime: string | null;
  midpoint: { latitude: number; longitude: number };
  walker: {
    displayName: string | null;
    avatarUrl: string | null;
    initial: string;
  } | null;
}

// 散歩データを距離・時間・地図・イベント表示用の値へ整形します。
export function useWalkDetailViewModel(walk: Walk | null | undefined): WalkDetailViewModel | null {
  const { i18n } = useTranslation();

  return useMemo(() => {
    // データ取得前は画面側が空状態として扱えるよう null を返します。
    if (!walk) return null;

    const distanceM = walk.distanceM ?? 0;
    const durationSec = walk.durationSec ?? 0;
    const coordinates = (walk.points ?? []).map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
    const events = walk.events ?? [];
    const durationMin = durationSec ? Math.round(durationSec / 60) : 0;
    const distanceDisplay = formatDistanceParts(distanceM, 'km', 2);
    const durationDisplay = formatDuration(durationSec, i18n.language);
    const paceDisplay = formatPace(durationSec, distanceM);
    const distanceKm = distanceDisplay.value;
    const date = formatShortDate(walk.startedAt);
    const dogNames = walk.dogs.map((d) => d.name).join(', ');
    const startTime = formatClockTime(walk.startedAt);
    const endTime = walk.endedAt ? formatClockTime(walk.endedAt) : null;
    const walker = walk.walker
      ? {
          displayName: walk.walker.name ?? walk.walker.displayName ?? null,
          avatarUrl: walk.walker.avatar ?? walk.walker.avatarUrl ?? null,
          initial: (walk.walker.name ?? walk.walker.displayName)?.trim().charAt(0).toUpperCase() ?? '?',
        }
      : null;
    const midpoint =
      coordinates.length > 0
        ? coordinates[Math.floor(coordinates.length / 2)]
        : TOKYO_STATION_COORDINATE;

    return {
      coordinates,
      events,
      durationMin,
      distanceKm,
      distanceDisplay,
      durationDisplay,
      paceDisplay,
      date,
      dogNames,
      startTime,
      endTime,
      midpoint,
      walker,
    };
  }, [i18n.language, walk]);
}
