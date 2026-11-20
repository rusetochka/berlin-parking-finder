/**
 * Parking Service — fetches and filters parking spots.
 *
 * Currently backed by mock data. The adapter pattern here makes it
 * straightforward to swap in real data sources:
 *
 *   TODO: Replace `import { MOCK_PARKING_SPOTS }` with a call to
 *         `fetchOverpassParking(lat, lng, radius)` from overpassAdapter.ts
 *         to pull live OpenStreetMap data.
 *
 *   TODO: Merge with BVG P+R data feed for park-and-ride locations.
 *         See https://www.bvg.de/de/verbindungen/park-and-ride
 *
 *   TODO: Consider caching results in sessionStorage keyed by
 *         `${lat},${lng},${radius}` to reduce API calls.
 */

import { fetchOverpassParking } from '@/services/overpassAdapter';
import { calculateDifficulty } from '@/services/difficultyScorer';
import type { FilterState, ParkingSpot, SearchLocation } from '@/types/parking';

const WALKING_SPEED_M_PER_MIN = 80;

// ─── Distance helpers ─────────────────────────────────────────────────────────

/**
 * Haversine formula — returns distance in metres between two coordinates.
 */
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateWalkingMinutes(distanceMeters: number): number {
  return Math.round(distanceMeters / WALKING_SPEED_M_PER_MIN);
}

// ─── Open-now check ───────────────────────────────────────────────────────────

function isOpenNow(spot: ParkingSpot, now: Date = new Date()): boolean {
  const { openingHours } = spot;
  if (openingHours === '24/7') return true;
  if (openingHours === 'unknown') return true; // benefit of the doubt

  const { intervals } = openingHours;
  if (!intervals || intervals.length === 0) return true;

  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return intervals.some((interval) => {
    if (!interval.daysOfWeek.includes(day)) return false;
    const [openH, openM] = interval.openTime.split(':').map(Number);
    const [closeH, closeM] = interval.closeTime.split(':').map(Number);
    const openMin = openH * 60 + (openM ?? 0);
    let closeMin = closeH * 60 + (closeM ?? 0);
    // Handle "close past midnight" (e.g., 06:00–01:00)
    if (closeMin < openMin) closeMin += 24 * 60;
    return currentMinutes >= openMin && currentMinutes <= closeMin;
  });
}

// ─── Fee comparator helper ────────────────────────────────────────────────────

/**
 * Extracts a numeric hourly rate from feeDescription for sorting.
 * Returns 0 for free, Infinity when unknown.
 */
function parseHourlyRate(spot: ParkingSpot): number {
  if (spot.isFree === true) return 0;
  if (!spot.feeDescription) return Infinity;
  const match = /€\s*([\d.,]+)\s*\/\s*hr/i.exec(spot.feeDescription);
  if (!match) return Infinity;
  return parseFloat(match[1].replace(',', '.'));
}

// ─── Main search function ─────────────────────────────────────────────────────

/**
 * Returns parking spots near a location, enriched with distance, walking time,
 * and difficulty scores, filtered and sorted according to the provided filters.
 *
 * @param location   The user's chosen search location
 * @param filters    Active filter/sort state
 * @param now        Reference time for difficulty scoring and open-now check
 */
export async function getNearbyParking(
  location: SearchLocation,
  filters: FilterState,
  now: Date = new Date(),
): Promise<ParkingSpot[]> {
  const rawSpots = await fetchOverpassParking(location.lat, location.lng, filters.radiusMeters);

  // Enrich each spot with computed fields
  let enriched: ParkingSpot[] = rawSpots.map((spot) => {
    const distanceMeters = haversineMetres(location.lat, location.lng, spot.lat, spot.lng);
    const walkingMinutes = estimateWalkingMinutes(distanceMeters);
    const difficulty = calculateDifficulty(spot, location, now);
    return { ...spot, distanceMeters, walkingMinutes, difficulty };
  });

  // ── Filter: radius ────────────────────────────────────────────────────────
  enriched = enriched.filter((s) => (s.distanceMeters ?? Infinity) <= filters.radiusMeters);

  // ── Filter: parking types ─────────────────────────────────────────────────
  if (filters.types.length > 0) {
    enriched = enriched.filter((s) => filters.types.includes(s.type));
  }

  // ── Filter: open now ──────────────────────────────────────────────────────
  if (filters.openNow) {
    enriched = enriched.filter((s) => isOpenNow(s, now));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  enriched.sort((a, b) => {
    switch (filters.sortBy) {
      case 'nearest':
        return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
      case 'cheapest':
        return parseHourlyRate(a) - parseHourlyRate(b);
      case 'easiest':
        return (a.difficulty?.score ?? 50) - (b.difficulty?.score ?? 50);
      default:
        return 0;
    }
  });

  return enriched;
}
