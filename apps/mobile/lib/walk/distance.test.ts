import { haversineDistance } from './distance';

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    const p = { lat: 35.6812, lng: 139.7671 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('calculates Tokyo Station to Shibuya Station (~3.3km)', () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const shibuya = { lat: 35.658, lng: 139.7016 };
    const distance = haversineDistance(tokyo, shibuya);
    expect(distance).toBeGreaterThan(3200);
    expect(distance).toBeLessThan(3500);
  });

  it('returns distance in meters', () => {
    const p1 = { lat: 35.6812, lng: 139.7671 };
    const p2 = { lat: 35.6813, lng: 139.7672 };
    const distance = haversineDistance(p1, p2);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20);
  });
});
