export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatPace(
  elapsedSec: number,
  totalM: number,
): { value: string; unit: string } {
  if (totalM < 100 || elapsedSec === 0) return { value: '—', unit: '/km' };
  const secPerKm = (elapsedSec / totalM) * 1000;
  const mm = Math.floor(secPerKm / 60);
  const ss = Math.floor(secPerKm % 60);
  return { value: `${mm}'${ss.toString().padStart(2, '0')}"`, unit: '/km' };
}

export function formatPaceString(elapsedSec: number, totalM: number): string {
  const { value, unit } = formatPace(elapsedSec, totalM);
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
