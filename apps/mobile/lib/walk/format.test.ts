import {
  formatTime,
  formatDistance,
  formatClockTime,
  formatWalkDateLabel,
  countWalkEvents,
} from './format';

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });
});

describe('formatDistance', () => {
  it('formats meters under 1km', () => {
    expect(formatDistance(500)).toBe('500 m');
  });

  it('formats km for 1000m or more', () => {
    expect(formatDistance(1500)).toBe('1.50 km');
  });
});

describe('formatClockTime', () => {
  it('returns a string containing hours and minutes', () => {
    const result = formatClockTime('2026-04-04T14:30:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('returns non-empty string for valid ISO input', () => {
    const result = formatClockTime('2026-04-04T09:00:00Z');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns fallback for invalid ISO string', () => {
    expect(formatClockTime('not-a-date')).toBe('--:--');
  });

  it('returns fallback for empty string', () => {
    expect(formatClockTime('')).toBe('--:--');
  });

  it('accepts a locale argument and returns a non-empty string', () => {
    const result = formatClockTime('2026-04-04T14:30:00Z', 'en-US');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('--:--');
  });

  it('falls back to HH:MM format when toLocaleTimeString throws', () => {
    const original = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleTimeString = () => {
      throw new RangeError('invalid locale');
    };
    try {
      const result = formatClockTime('2026-04-04T14:30:00Z');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    } finally {
      Date.prototype.toLocaleTimeString = original;
    }
  });
});

describe('formatWalkDateLabel', () => {
  const now = new Date(2026, 3, 19, 12, 0, 0); // 2026-04-19 12:00 local

  it('labels same local day as "Today"', () => {
    const iso = new Date(2026, 3, 19, 8, 30).toISOString();
    expect(formatWalkDateLabel(iso, now)).toMatch(/^Today · /);
  });

  it('labels previous local day as "Yesterday"', () => {
    const iso = new Date(2026, 3, 18, 18, 12).toISOString();
    expect(formatWalkDateLabel(iso, now)).toMatch(/^Yesterday · /);
  });

  it('labels older days with weekday short name', () => {
    // 2026-04-13 was a Monday
    const iso = new Date(2026, 3, 13, 6, 40).toISOString();
    expect(formatWalkDateLabel(iso, now)).toMatch(/^Mon · /);
  });

  it('honours custom today/yesterday labels', () => {
    const iso = new Date(2026, 3, 19, 8, 30).toISOString();
    expect(
      formatWalkDateLabel(iso, now, { today: '今日', yesterday: '昨日' }),
    ).toMatch(/^今日 · /);
  });

  it('returns "--" for invalid date', () => {
    expect(formatWalkDateLabel('garbage', now)).toBe('--');
  });
});

describe('countWalkEvents', () => {
  it('returns zeros for undefined or empty events', () => {
    expect(countWalkEvents()).toEqual({ pee: 0, poo: 0 });
    expect(countWalkEvents([])).toEqual({ pee: 0, poo: 0 });
    expect(countWalkEvents(null)).toEqual({ pee: 0, poo: 0 });
  });

  it('counts pee and poo events and ignores photos', () => {
    const events = [
      { eventType: 'pee' as const },
      { eventType: 'poo' as const },
      { eventType: 'pee' as const },
      { eventType: 'photo' as const },
    ];
    expect(countWalkEvents(events)).toEqual({ pee: 2, poo: 1 });
  });
});
