/**
 * Overpass API Adapter — skeleton for fetching real parking data from OpenStreetMap.
 *
 * This module is intentionally a stub. When you are ready to switch from mock
 * data to real OSM data, implement `fetchOverpassParking` and call it from
 * src/services/parkingService.ts instead of MOCK_PARKING_SPOTS.
 *
 * ─── OSM Tags used ────────────────────────────────────────────────────────────
 *
 *   amenity=parking           — general parking area or structure
 *   parking=multi-storey      — multi-storey garage
 *   parking=underground       — underground car park
 *   parking=surface           — open surface lot
 *   park_ride=yes             — park and ride facility
 *   fee=yes/no                — whether a fee is charged
 *   capacity=*                — total vehicle capacity
 *   opening_hours=*           — OSM opening hours string (e.g. "Mo-Fr 07:00-22:00")
 *   name=*                    — name of the facility
 *   addr:street, addr:housenumber, addr:postcode, addr:city — address components
 *
 * ─── Overpass API docs ────────────────────────────────────────────────────────
 *   https://overpass-api.de/api/interpreter
 *   https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
 *
 * ─── Rate limits / usage ─────────────────────────────────────────────────────
 *   Public instance: https://overpass-api.de — fair use, no key required.
 *   For production traffic, self-host or use a commercial tile provider.
 */

import type { ParkingSpot, ParkingType } from '@/types/parking';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Build an Overpass QL query that fetches parking areas within a radius.
 *
 * @param lat          Centre latitude
 * @param lng          Centre longitude
 * @param radiusMeters Search radius in metres
 */
export function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `
[out:json][timeout:25];
(
  node["amenity"="parking"](around:${radiusMeters},${lat},${lng});
  way["amenity"="parking"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="parking"](around:${radiusMeters},${lat},${lng});
  node["park_ride"="yes"](around:${radiusMeters},${lat},${lng});
  way["park_ride"="yes"](around:${radiusMeters},${lat},${lng});
);
out body center;
>;
out skel qt;
  `.trim();
}

// ─── Raw Overpass response types ─────────────────────────────────────────────

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Normalise raw Overpass API results into ParkingSpot objects.
 *
 * TODO: implement opening_hours parsing (OSM format is complex;
 *       consider the `opening_hours` npm package).
 */
export function parseOverpassResult(rawData: OverpassResponse): ParkingSpot[] {
  return rawData.elements
    .filter((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      return lat !== undefined && lon !== undefined;
    })
    .map((el) => {
      const lat = (el.lat ?? el.center?.lat)!;
      const lng = (el.lon ?? el.center?.lon)!;
      const tags = el.tags ?? {};

      const type = resolveType(tags);
      const isFree = tags['fee'] === 'no' ? true : tags['fee'] === 'yes' ? false : undefined;

      const addressParts = [
        tags['addr:street'],
        tags['addr:housenumber'],
        tags['addr:postcode'],
        tags['addr:city'] ?? 'Berlin',
      ].filter(Boolean);

      return {
        id: `osm-${el.type}-${el.id}`,
        name: tags['name'] ?? tags['operator'] ?? 'Unnamed Parking',
        type,
        lat,
        lng,
        address: addressParts.length > 0 ? addressParts.join(' ') : 'Berlin',
        capacity: tags['capacity'] ? parseInt(tags['capacity'], 10) : undefined,
        isFree,
        feeDescription: undefined, // TODO: derive from OSM tags if available
        // TODO: parse OSM opening_hours string properly
        openingHours: tags['opening_hours'] === '24/7' ? '24/7' : 'unknown',
        dataSource: 'osm' as const,
        isLiveData: false,
      } satisfies ParkingSpot;
    });
}

function resolveType(tags: Record<string, string>): ParkingType {
  if (tags['park_ride'] === 'yes') return 'park_and_ride';
  const parking = tags['parking'];
  if (parking === 'multi-storey' || parking === 'underground') return 'garage';
  if (parking === 'surface') return 'lot';
  if (parking === 'street_side') return 'street_zone';
  return 'unknown';
}

// ─── Fetch function ───────────────────────────────────────────────────────────

/**
 * Fetch parking spots near a location from the Overpass API.
 *
 * TODO: Call this from parkingService.ts to replace mock data:
 *
 *   import { fetchOverpassParking } from '@/services/overpassAdapter';
 *   const rawSpots = await fetchOverpassParking(lat, lng, radiusMeters);
 */
export async function fetchOverpassParking(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<ParkingSpot[]> {
  const query = buildOverpassQuery(lat, lng, radiusMeters);

  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data: OverpassResponse = await response.json() as OverpassResponse;
  return parseOverpassResult(data);
}
