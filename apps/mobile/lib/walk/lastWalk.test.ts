import i18n from '@/lib/i18n';
import { formatLastWalk } from './lastWalk';

const t = i18n.getFixedT('en');

describe('formatLastWalk', () => {
  const now = new Date('2026-04-18T12:00:00Z');

  it('returns never label when endedAt is null', () => {
    expect(formatLastWalk(null, now, t)).toBe('Ready for the first walk');
  });

  it('returns never label when endedAt is undefined', () => {
    expect(formatLastWalk(undefined, now, t)).toBe('Ready for the first walk');
  });

  it('returns never label when endedAt is invalid', () => {
    expect(formatLastWalk('not-a-date', now, t)).toBe('Ready for the first walk');
  });

  it('returns justNow within the first minute', () => {
    const endedAt = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatLastWalk(endedAt, now, t)).toBe('Last walk just now');
  });

  it('returns minutesAgo for under an hour', () => {
    const endedAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    expect(formatLastWalk(endedAt, now, t)).toBe('Last walk 10 min ago');
  });

  it('returns hoursAgo singular for 1 hour', () => {
    const endedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(formatLastWalk(endedAt, now, t)).toBe('Last walk 1 hour ago');
  });

  it('returns hoursAgo plural for 14 hours', () => {
    const endedAt = new Date(now.getTime() - 14 * 60 * 60 * 1000).toISOString();
    expect(formatLastWalk(endedAt, now, t)).toBe('Last walk 14 hours ago');
  });

  it('returns yesterday for 30 hours ago crossing a day', () => {
    const endedAt = new Date('2026-04-17T06:00:00Z').toISOString();
    expect(formatLastWalk(endedAt, now, t)).toBe('Last walk yesterday');
  });

  it('returns daysAgo for 3 days ago', () => {
    const endedAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastWalk(endedAt, now, t)).toBe('Last walk 3 days ago');
  });
});
