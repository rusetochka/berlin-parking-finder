/**
 * Geocoding service — wraps Nominatim (OpenStreetMap).
 *
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 *   - Do not exceed 1 request/second
 *   - Set a descriptive User-Agent header
 *   - Provide attribution in the UI: "© OpenStreetMap contributors"
 *
 * TODO: For production, self-host Nominatim or switch to Photon (komoot) or
 *       a commercial geocoding API (e.g., Google Maps, Mapbox, HERE).
 */

import type { GeocodingResult, NominatimResult } from '@/types/geocoding';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Berlin bounding box — restricts results to Berlin area
const BERLIN_VIEWBOX = '13.088,52.338,13.761,52.677';

const HEADERS: HeadersInit = {
  // Nominatim policy: identify your app in the User-Agent
  'User-Agent': 'BerlinParkingSearchApp/0.1 (development)',
  'Accept-Language': 'de,en',
};

/**
 * Forward geocode: address string → coordinates + display name.
 * Returns up to 5 results bounded to Berlin.
 */
export async function geocodeAddress(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    viewbox: BERLIN_VIEWBOX,
    bounded: '1',
    countrycodes: 'de',
    'accept-language': 'de',
  });

  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
  }

  const data: NominatimResult[] = await response.json() as NominatimResult[];

  return data.map((item) => ({
    id: String(item.place_id),
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}

/**
 * Reverse geocode: coordinates → address string.
 * Used when the user clicks on the map.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'de',
  });

  const url = `${NOMINATIM_BASE}/reverse?${params.toString()}`;

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) return null;

  const data: NominatimResult = await response.json() as NominatimResult;
  if (!data.lat) return null;

  // Build a short display name from structured address components so the
  // search bar doesn't show just a house number (e.g. "42" from "42, Musterstraße, Berlin…")
  const addr = data.address;
  let displayName = data.display_name;
  if (addr) {
    const road = addr.road ?? addr.suburb ?? addr.city_district ?? '';
    const houseNum = addr.house_number ? ` ${addr.house_number}` : '';
    const city = addr.city ?? '';
    if (road) displayName = `${road}${houseNum}${city ? ', ' + city : ''}`;
  }

  return {
    id: String(data.place_id),
    displayName,
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
  };
}
