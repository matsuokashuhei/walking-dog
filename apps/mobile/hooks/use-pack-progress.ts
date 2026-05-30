import { useMemo } from 'react';
import { DEFAULT_DAILY_GOAL_MINUTES } from '@/constants/walk';
import { useMe } from './use-me';
import { useMyWalks } from './use-walks';
import type { Dog, Walk } from '@/types/graphql';

// 犬ごとの今日の距離・時間、総散歩数、継続日数を表します。
interface DogProgress {
  todayKm: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  totalWalks: number;
  streakDays: number;
}

// パック全体と犬ごとの散歩進捗を、ホームや犬一覧で使う形にまとめた値です。
export interface PackProgress {
  todayKm: number;
  todayMinutes: number;
  goalMinutes: number;
  progressPct: number;
  packStreakDays: number;
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

// ローカル日付で連続散歩日数を計算し、昨日まで継続中の場合も streak として扱います。
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

// 散歩履歴から、パック全体と犬ごとの今日の進捗・連続日数を集計します。
export function aggregatePackProgress(
  walks: Walk[],
  dogs: Dog[] = [],
  now: Date = new Date(),
): Omit<PackProgress, 'isLoading'> {
  const todayKey = localDayKey(now);

  let packTodayM = 0;
  let packTodayMinutes = 0;
  const packDays = new Set<string>();
  const dogDays = new Map<string, Set<string>>();
  const dogTodayM = new Map<string, number>();
  const dogTodayMinutes = new Map<string, number>();
  const dogTotalWalks = new Map<string, number>();
  const dogGoalMinutes = new Map<string, number>();

  for (const dog of dogs) {
    dogGoalMinutes.set(dog.id, getDailyGoalMinutes(dog));
  }
  const currentDogIds = new Set(dogGoalMinutes.keys());
  const hasCurrentDogs = currentDogIds.size > 0;

  // 散歩単位の距離をパック全体へ、参加中の犬ごとには個別進捗へ積み上げます。
  for (const walk of walks) {
    const dayKey = toLocalDayKey(walk.startedAt);
    const distanceM = walk.distanceM ?? 0;
    const durationMinutes = durationSecToMinutes(walk.durationSec ?? null);
    let includesCurrentDog = false;

    for (const dog of walk.dogs ?? []) {
      if (!dog?.id) continue;
      if (hasCurrentDogs && !currentDogIds.has(dog.id)) continue;
      includesCurrentDog = true;
      let set = dogDays.get(dog.id);
      if (!set) {
        set = new Set();
        dogDays.set(dog.id, set);
      }
      if (dayKey) set.add(dayKey);

      dogTotalWalks.set(dog.id, (dogTotalWalks.get(dog.id) ?? 0) + 1);
      if (dayKey === todayKey) {
        dogTodayM.set(dog.id, (dogTodayM.get(dog.id) ?? 0) + distanceM);
        dogTodayMinutes.set(
          dog.id,
          (dogTodayMinutes.get(dog.id) ?? 0) + durationMinutes,
        );
        packTodayMinutes += durationMinutes;
      }
    }

    if (includesCurrentDog) {
      if (dayKey === todayKey) packTodayM += distanceM;
      if (dayKey) packDays.add(dayKey);
    }
  }

  const perDog: Record<string, DogProgress> = {};
  const dogIds = new Set([...dogGoalMinutes.keys(), ...dogDays.keys()]);
  for (const dogId of dogIds) {
    const days = dogDays.get(dogId) ?? new Set<string>();
    perDog[dogId] = {
      todayKm: (dogTodayM.get(dogId) ?? 0) / 1000,
      todayMinutes: dogTodayMinutes.get(dogId) ?? 0,
      dailyGoalMinutes: dogGoalMinutes.get(dogId) ?? DEFAULT_DAILY_GOAL_MINUTES,
      totalWalks: dogTotalWalks.get(dogId) ?? 0,
      streakDays: computeStreak(days, now),
    };
  }

  const todayKm = packTodayM / 1000;
  const goalMinutes = Array.from(dogIds).reduce(
    (total, dogId) => total + (dogGoalMinutes.get(dogId) ?? DEFAULT_DAILY_GOAL_MINUTES),
    0,
  );
  const progressPct =
    goalMinutes > 0 ? Math.min(100, Math.round((packTodayMinutes / goalMinutes) * 100)) : 0;
  const packStreakDays = computeStreak(packDays, now);

  return {
    todayKm,
    todayMinutes: packTodayMinutes,
    goalMinutes,
    progressPct,
    packStreakDays,
    perDog,
  };
}

// 最新の散歩履歴をもとに、パック進捗をメモ化して返します。
export function usePackProgress(): PackProgress {
  const { data, isLoading } = useMyWalks(100);
  const { data: me, isLoading: isMeLoading } = useMe();
  return useMemo(() => {
    const walks = data ?? [];
    return {
      ...aggregatePackProgress(walks, me?.dogs ?? []),
      isLoading: isLoading || isMeLoading,
    };
  }, [data, isLoading, isMeLoading, me?.dogs]);
}

function getDailyGoalMinutes(dog: Dog): number {
  const minutes = dog.walkGoal?.walkAmount.minutes;
  return typeof minutes === 'number' && Number.isInteger(minutes) && minutes > 0
    ? minutes
    : DEFAULT_DAILY_GOAL_MINUTES;
}

function durationSecToMinutes(durationSec: number | null): number {
  if (durationSec == null || durationSec <= 0) return 0;
  return Math.round(durationSec / 60);
}
