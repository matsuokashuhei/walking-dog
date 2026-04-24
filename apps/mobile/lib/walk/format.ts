export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type DistanceUnit = 'km' | 'mile';

type DateInput = Date | string;

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

function resolveDate(value: DateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isJapaneseLocale(locale?: string): boolean {
  return locale?.toLowerCase().startsWith('ja') ?? false;
}

export function formatDuration(totalSec: number, locale?: string): string {
  const safeTotalSec = Math.max(0, Math.floor(totalSec));
  if (safeTotalSec < 3600) {
    return formatTime(safeTotalSec);
  }

  const hours = Math.floor(safeTotalSec / 3600);
  const minutes = Math.floor((safeTotalSec % 3600) / 60);
  if (isJapaneseLocale(locale)) {
    return `${hours}時間${minutes}分`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatDistance(
  meters: number,
  units: DistanceUnit = 'km',
  precision = 2,
): string {
  if (units === 'mile') {
    const miles = meters / METERS_PER_MILE;
    if (miles < 1) {
      const feet = meters / METERS_PER_FOOT;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(precision)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(precision)} km`;
}

export function formatDistanceParts(
  meters: number,
  units: DistanceUnit = 'km',
  precision = 2,
): { value: string; unit: string } {
  const formatted = formatDistance(meters, units, precision).trim();
  const match = formatted.match(/^([\d.]+)\s*(\S+)?$/);
  return {
    value: match?.[1] ?? formatted,
    unit: match?.[2] ?? '',
  };
}

export function formatPace(
  elapsedSec: number,
  totalM: number,
  units: DistanceUnit = 'km',
): { value: string; unit: string } {
  const unitLabel = units === 'mile' ? '/mi' : '/km';
  if (totalM < 100 || elapsedSec === 0) return { value: '—', unit: unitLabel };
  const denomMeters = units === 'mile' ? METERS_PER_MILE : 1000;
  const secPerUnit = (elapsedSec / totalM) * denomMeters;
  const mm = Math.floor(secPerUnit / 60);
  const ss = Math.floor(secPerUnit % 60);
  return { value: `${mm}'${ss.toString().padStart(2, '0')}"`, unit: unitLabel };
}

export function formatPaceString(
  elapsedSec: number,
  totalM: number,
  units: DistanceUnit = 'km',
): string {
  const { value, unit } = formatPace(elapsedSec, totalM, units);
  return `${value}${unit}`;
}

export function formatClockTime(isoString: string, locale?: string): string {
  const date = resolveDate(isoString);
  if (!date) {
    console.warn(`[formatClockTime] Invalid ISO string received: "${isoString}"`);
    return '--:--';
  }
  try {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.warn('[formatClockTime] toLocaleTimeString failed, falling back', e);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

export function formatShortDate(value: DateInput, locale?: string): string {
  const date = resolveDate(value);
  if (!date) return '--';

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    console.warn('[formatShortDate] Intl.DateTimeFormat failed, falling back', e);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }
}

export function formatDateTime(value: DateInput, locale?: string): string {
  const date = resolveDate(value);
  if (!date) return '--';

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (e) {
    console.warn('[formatDateTime] Intl.DateTimeFormat failed, falling back', e);
    return `${formatShortDate(date, locale)} ${formatClockTime(date.toISOString(), locale)}`;
  }
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatWalkDateLabel(
  isoString: string,
  now: Date = new Date(),
  labels?: { today?: string; yesterday?: string },
): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--';
  const today = startOfLocalDay(now);
  const target = startOfLocalDay(d);
  const diffDays = Math.round((today - target) / 86_400_000);
  let prefix: string;
  if (diffDays === 0) prefix = labels?.today ?? 'Today';
  else if (diffDays === 1) prefix = labels?.yesterday ?? 'Yesterday';
  else prefix = WEEKDAY_LABELS[d.getDay()];
  return `${prefix} · ${formatClockTime(isoString)}`;
}

