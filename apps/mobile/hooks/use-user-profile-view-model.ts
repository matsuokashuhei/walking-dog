import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistance, formatDistanceParts, formatDuration } from '@/lib/walk/format';
import { useUserProfile, type UserProfileData } from './use-user-profile';

type UserProfileStatus = 'loading' | 'error' | 'ready';
type Translate = (key: string, values?: Record<string, unknown>) => string;

export interface UserProfileMetricViewModel {
  key: 'walks' | 'distance' | 'totalTime' | 'dogs';
  value: string;
  label: string;
}

export interface UserProfileWeekDayViewModel {
  key: string;
  label: string;
  distanceKm: number;
  valueLabel: string;
  progress: number;
  isToday: boolean;
}

export interface UserProfileWeekViewModel {
  title: string;
  totalLabel: string;
  days: UserProfileWeekDayViewModel[];
}

interface UserProfileBaseViewModel {
  status: UserProfileStatus;
  handleRetry: () => void;
}

export interface UserProfileReadyViewModel extends UserProfileBaseViewModel {
  status: 'ready';
  displayName: string;
  avatarUrl: string | null;
  initial: string;
  walkingSince: string;
  metrics: UserProfileMetricViewModel[];
  week: UserProfileWeekViewModel;
}

export type UserProfileViewModel =
  | (UserProfileBaseViewModel & { status: 'loading' })
  | (UserProfileBaseViewModel & { status: 'error' })
  | UserProfileReadyViewModel;

export type { UserProfileData } from './use-user-profile';

export function useUserProfileViewModel(): UserProfileViewModel {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error, refetch } = useUserProfile();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return { status: 'loading', handleRetry };
  if (error || !data) return { status: 'error', handleRetry };

  return {
    status: 'ready',
    handleRetry,
    ...buildUserProfileViewModel(data, t, new Date(), i18n.language),
  };
}

export function buildUserProfileViewModel(
  data: UserProfileData,
  t: Translate,
  now: Date = new Date(),
  locale?: string,
): Omit<UserProfileReadyViewModel, 'status' | 'handleRetry'> {
  const rawDisplayName = data.user.name ?? data.user.displayName ?? null;
  const displayName = rawDisplayName?.trim() || t('settings.profile.unknownName');
  const initial = rawDisplayName?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  const distanceParts = formatDistanceParts(data.totalDistanceM, 'km', 1);

  return {
    displayName,
    avatarUrl: data.user.avatar ?? data.user.avatarUrl ?? null,
    initial,
    walkingSince: t('settings.profile.walkingSince', {
      date: formatMonthYear(data.user.createdAt, locale),
    }),
    metrics: [
      {
        key: 'walks',
        value: String(data.totalWalks),
        label: t('settings.profile.stats.walks'),
      },
      {
        key: 'distance',
        value: distanceParts.value,
        label: distanceParts.unit || t('settings.profile.stats.distance'),
      },
      {
        key: 'totalTime',
        value: formatDuration(data.totalDurationSec, locale),
        label: t('settings.profile.stats.totalTime'),
      },
      {
        key: 'dogs',
        value: String(data.user.dogs.length),
        label: t('settings.profile.stats.dogs'),
      },
    ],
    week: buildWeekViewModel(data.recentWalks, t, now, locale),
  };
}

function buildWeekViewModel(
  walks: UserProfileData['recentWalks'],
  t: Translate,
  now: Date,
  locale?: string,
): UserProfileWeekViewModel {
  const weekStart = startOfWeekMonday(now);
  const metersByDay = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const date = shiftDays(weekStart, i);
    metersByDay.set(localDayKey(date), 0);
  }

  for (const walk of walks) {
    const key = localDayKey(new Date(walk.startedAt));
    if (metersByDay.has(key)) {
      metersByDay.set(key, (metersByDay.get(key) ?? 0) + walk.distanceM);
    }
  }

  const totalM = [...metersByDay.values()].reduce((sum, meters) => sum + meters, 0);
  const maxM = Math.max(...metersByDay.values(), 0);
  const todayKey = localDayKey(now);
  const days = [...metersByDay.entries()].map(([key, meters]) => {
    const date = localDateFromKey(key);
    const distanceKm = Number((meters / 1000).toFixed(1));
    return {
      key,
      label: formatWeekday(date, locale),
      distanceKm,
      valueLabel: meters > 0 ? distanceKm.toFixed(1) : '',
      progress: maxM > 0 ? Number((meters / maxM).toFixed(2)) : 0,
      isToday: key === todayKey,
    };
  });

  return {
    title: t('settings.profile.week.title'),
    totalLabel: t('settings.profile.week.total', {
      distance: formatDistance(totalM, 'km', 1),
    }),
    days,
  };
}

function formatMonthYear(value: string, locale?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatWeekday(value: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(value);
}

function startOfWeekMonday(value: Date): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftDays(date, diff);
}

function shiftDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

function localDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
