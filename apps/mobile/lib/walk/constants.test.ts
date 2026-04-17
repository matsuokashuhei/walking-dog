import { TOKYO_STATION_COORDINATE } from './constants';

describe('TOKYO_STATION_COORDINATE', () => {
  it('has Tokyo Station latitude and longitude', () => {
    expect(TOKYO_STATION_COORDINATE).toEqual({ latitude: 35.6812, longitude: 139.7671 });
  });

  it('is frozen so consumers cannot mutate the shared object', () => {
    expect(Object.isFrozen(TOKYO_STATION_COORDINATE)).toBe(true);
  });
});
