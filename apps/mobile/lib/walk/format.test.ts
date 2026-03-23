import { formatTime, formatDistance } from './format';

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
