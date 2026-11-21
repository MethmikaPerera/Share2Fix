const EARTH_RADIUS_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Rough bounding box of Sri Lanka (incl. surrounding waters) used to reject clearly wrong coordinates. */
export const SRI_LANKA_BOUNDS = { minLat: 5.5, maxLat: 10.1, minLng: 79.3, maxLng: 82.1 };

export function isWithinSriLanka(lat: number, lng: number): boolean {
  const b = SRI_LANKA_BOUNDS;
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}
