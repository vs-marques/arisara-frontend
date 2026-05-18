/**
 * Retângulo geográfico da viewport do mapa (Leaflet getBounds).
 */
export type MapViewportBBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export function listingHasGeoCoords(l: { lat?: unknown; lng?: unknown }): boolean {
  return (
    typeof l.lat === "number" &&
    typeof l.lng === "number" &&
    Number.isFinite(l.lat) &&
    Number.isFinite(l.lng)
  );
}

export function listingInViewportBBox(l: { lat: number | null; lng: number | null }, b: MapViewportBBox): boolean {
  if (!listingHasGeoCoords(l)) return false;
  const lat = l.lat as number;
  const lng = l.lng as number;
  if (lat < b.south || lat > b.north) return false;
  if (b.west <= b.east) {
    return lng >= b.west && lng <= b.east;
  }
  return lng >= b.west || lng <= b.east;
}
