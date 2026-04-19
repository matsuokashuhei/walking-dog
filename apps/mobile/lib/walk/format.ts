export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type DistanceUnit = 'km' | 'mile';

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

export function formatDistance(meters: number, units: DistanceUnit = 'km'): string {
  if (units === 'mile') {
    const miles = meters / METERS_PER_MILE;
    if (miles < 1) {
      const feet = meters / METERS_PER_FOOT;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
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
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
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

interface CountableEvent {
  eventType: 'pee' | 'poo' | 'photo';
}

export function countWalkEvents(events?: CountableEvent[] | null): {
  pee: number;
  poo: number;
} {
  if (!events || events.length === 0) return { pee: 0, poo: 0 };
  let pee = 0;
  let poo = 0;
  for (const event of events) {
    if (event.eventType === 'pee') pee += 1;
    else if (event.eventType === 'poo') poo += 1;
  }
  return { pee, poo };
}
