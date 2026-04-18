import type { TFunction } from 'i18next';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function isYesterday(then: Date, now: Date): boolean {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return (
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate()
  );
}

export function formatLastWalk(
  endedAt: string | null | undefined,
  now: Date,
  t: TFunction,
): string {
  if (!endedAt) return t('walk.ready.lastWalk.never');

  const then = new Date(endedAt);
  if (Number.isNaN(then.getTime())) return t('walk.ready.lastWalk.never');

  const diffMs = now.getTime() - then.getTime();
  if (diffMs < MINUTE) return t('walk.ready.lastWalk.justNow');
  if (diffMs < HOUR) {
    const minutes = Math.max(1, Math.floor(diffMs / MINUTE));
    return t('walk.ready.lastWalk.minutesAgo', { count: minutes });
  }
  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return t('walk.ready.lastWalk.hoursAgo', { count: hours });
  }
  if (isYesterday(then, now)) return t('walk.ready.lastWalk.yesterday');

  const days = Math.floor(diffMs / DAY);
  return t('walk.ready.lastWalk.daysAgo', { count: days });
}
