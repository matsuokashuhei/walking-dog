import { useMemo } from 'react';
import { DEFAULT_DAILY_GOAL_KM } from '@/constants/walk';
import { useMyWalks } from './use-walks';
import type { Walk } from '@/types/graphql';

export interface DogProgress {
  todayKm: number;
  totalWalks: number;
  streakDays: number;
}

export interface PackProgress {
  todayKm: number;
  goalKm: number;
  progressPct: number;
  perDog: Record<string, DogProgress>;
  isLoading: boolean;
}

function toLocalDayKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDay(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

function computeStreak(dayKeys: Set<string>, now: Date): number {
  if (dayKeys.size === 0) return 0;
  const today = localDayKey(now);
  const yesterday = localDayKey(shiftDay(now, -1));
  let cursor: Date;
  if (dayKeys.has(today)) cursor = now;
  else if (dayKeys.has(yesterday)) cursor = shiftDay(now, -1);
  else return 0;
  let streak = 0;
  while (dayKeys.has(localDayKey(cursor))) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

export function aggregatePackProgress(
  walks: Walk[],
  goalKm: number = DEFAULT_DAILY_GOAL_KM,
  now: Date = new Date(),
): Omit<PackProgress, 'isLoading'> {
  const todayKey = localDayKey(now);

  let packTodayM = 0;
  const dogDays = new Map<string, Set<string>>();
  const dogTodayM = new Map<string, number>();
  const dogTotalWalks = new Map<string, number>();

  for (const walk of walks) {
    const dayKey = toLocalDayKey(walk.startedAt);
    const distanceM = walk.distanceM ?? 0;
    if (dayKey === todayKey) packTodayM += distanceM;

    for (const dog of walk.dogs ?? []) {
      if (!dog?.id) continue;
      let set = dogDays.get(dog.id);
      if (!set) {
        set = new Set();
        dogDays.set(dog.id, set);
      }
      if (dayKey) set.add(dayKey);

      dogTotalWalks.set(dog.id, (dogTotalWalks.get(dog.id) ?? 0) + 1);
      if (dayKey === todayKey) {
        dogTodayM.set(dog.id, (dogTodayM.get(dog.id) ?? 0) + distanceM);
      }
    }
  }

  const perDog: Record<string, DogProgress> = {};
  for (const [dogId, days] of dogDays.entries()) {
    perDog[dogId] = {
      todayKm: (dogTodayM.get(dogId) ?? 0) / 1000,
      totalWalks: dogTotalWalks.get(dogId) ?? 0,
      streakDays: computeStreak(days, now),
    };
  }

  const todayKm = packTodayM / 1000;
  const progressPct =
    goalKm > 0 ? Math.min(100, Math.round((todayKm / goalKm) * 100)) : 0;

  return { todayKm, goalKm, progressPct, perDog };
}

export function usePackProgress(goalKm: number = DEFAULT_DAILY_GOAL_KM): PackProgress {
  const { data, isLoading } = useMyWalks(100);
  return useMemo(() => {
    const walks = data ?? [];
    return { ...aggregatePackProgress(walks, goalKm), isLoading };
  }, [data, goalKm, isLoading]);
}
