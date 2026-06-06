import type { WalkPoint } from '@/types/graphql';

const DUPLICATE_COORDINATE_TOLERANCE = 0.0000001;

export function isDuplicateWalkPoint(points: WalkPoint[], point: WalkPoint): boolean {
  return points.some(
    (existing) =>
      existing.recordedAt === point.recordedAt &&
      Math.abs(existing.lat - point.lat) <= DUPLICATE_COORDINATE_TOLERANCE &&
      Math.abs(existing.lng - point.lng) <= DUPLICATE_COORDINATE_TOLERANCE,
  );
}

export function appendUniqueWalkPoints(points: WalkPoint[], incomingPoints: WalkPoint[]): WalkPoint[] {
  let nextPoints = points;

  for (const point of incomingPoints) {
    if (isDuplicateWalkPoint(nextPoints, point)) continue;
    if (nextPoints === points) {
      nextPoints = [...points];
    }
    nextPoints.push(point);
  }

  return nextPoints;
}
