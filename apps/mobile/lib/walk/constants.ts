/**
 * Tokyo Station fallback coordinate.
 *
 * Used when a walk has no recorded GPS points yet — the map needs an initial
 * region to render. Tokyo Station is a central, recognizable landmark and is
 * a neutral choice for domestic users. Callers should replace this with an
 * actual walk coordinate as soon as one becomes available.
 */
export const TOKYO_STATION_COORDINATE: { latitude: number; longitude: number } = Object.freeze({
  latitude: 35.6812,
  longitude: 139.7671,
});
