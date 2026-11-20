// ─── Nominatim Geocoding Types ─────────────────────────────────────────────

/**
 * Raw response item from Nominatim /search endpoint.
 * Only the fields we use are typed here.
 */
export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/** Normalised geocoding result used throughout the app */
export interface GeocodingResult {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
}
