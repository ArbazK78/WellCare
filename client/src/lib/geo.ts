export type CoordinatePoint = { lat: number; lng: number };

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number) => degrees * Math.PI / 180;

export const distanceBetweenCoordinatesMeters = (
  from: CoordinatePoint | null | undefined,
  to: CoordinatePoint | null | undefined,
) => {
  if (!from || !to) return Number.POSITIVE_INFINITY;

  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
};