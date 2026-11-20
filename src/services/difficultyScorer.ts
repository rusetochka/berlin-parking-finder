/**
 * Parking Difficulty Scorer
 *
 * Produces an estimated parking difficulty score (0–100) using local heuristics.
 * This is NOT live occupancy data — it is a best-effort estimate based on:
 *   - Neighborhood density / proximity to Berlin city centre
 *   - Day of week
 *   - Time of day
 *   - Parking type
 *   - Distance from Brandenburger Tor (central reference point)
 *
 * The output is always labelled as "Estimated parking difficulty" in the UI.
 *
 * TODO: Replace or augment these heuristics with real-time data from:
 *   - ParkAPI (German parking API with live occupancy for some garages)
 *   - BVG P+R live occupancy feed
 *   - User feedback mechanism (future feature)
 */

import type { DifficultyLevel, DifficultyResult, ParkingSpot, ParkingType, SearchLocation } from '@/types/parking';

// ─── Reference point: Brandenburger Tor ─────────────────────────────────────
const BERLIN_CENTER_LAT = 52.5163;
const BERLIN_CENTER_LNG = 13.3777;

// ─── Neighbourhood density boxes ────────────────────────────────────────────
// Each box defines a lat/lng bounding box and a density score (0–100).
// Higher density = harder to find parking.
// Ordered from most central/dense to least.
const NEIGHBOURHOOD_DENSITY: Array<{
  name: string;
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
  density: number;
}> = [
  // Mitte / Kreuzberg inner
  { name: 'Mitte', minLat: 52.510, maxLat: 52.530, minLng: 13.370, maxLng: 13.430, density: 90 },
  // Potsdamer Platz / Tiergarten
  { name: 'Tiergarten/Potsdamer', minLat: 52.500, maxLat: 52.520, minLng: 13.350, maxLng: 13.385, density: 85 },
  // Prenzlauer Berg
  { name: 'Prenzlauer Berg', minLat: 52.530, maxLat: 52.555, minLng: 13.400, maxLng: 13.440, density: 80 },
  // Kreuzberg / Neukölln north
  { name: 'Kreuzberg', minLat: 52.485, maxLat: 52.510, minLng: 13.380, maxLng: 13.430, density: 80 },
  // Friedrichshain
  { name: 'Friedrichshain', minLat: 52.505, maxLat: 52.525, minLng: 13.430, maxLng: 13.470, density: 75 },
  // Charlottenburg shopping (Ku'damm / KaDeWe)
  { name: 'Charlottenburg', minLat: 52.495, maxLat: 52.520, minLng: 13.300, maxLng: 13.355, density: 75 },
  // Schöneberg
  { name: 'Schöneberg', minLat: 52.475, maxLat: 52.500, minLng: 13.330, maxLng: 13.365, density: 65 },
  // Neukölln centre
  { name: 'Neukölln', minLat: 52.470, maxLat: 52.495, minLng: 13.420, maxLng: 13.460, density: 60 },
  // Wedding / Reinickendorf
  { name: 'Wedding', minLat: 52.545, maxLat: 52.580, minLng: 13.340, maxLng: 13.380, density: 50 },
  // Spandau
  { name: 'Spandau', minLat: 52.525, maxLat: 52.550, minLng: 13.180, maxLng: 13.220, density: 35 },
  // Marzahn / Hellersdorf
  { name: 'Marzahn', minLat: 52.525, maxLat: 52.560, minLng: 13.540, maxLng: 13.590, density: 30 },
  // Tempelhof / Steglitz
  { name: 'Tempelhof', minLat: 52.460, maxLat: 52.490, minLng: 13.360, maxLng: 13.410, density: 45 },
];

// ─── Parking type baseline scores ────────────────────────────────────────────
// Street parking is hardest (competition for spaces); garages easiest.
const TYPE_BASELINE: Record<ParkingType, number> = {
  street_zone: 70,
  lot: 45,
  park_and_ride: 25,
  garage: 30,
  unknown: 50,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDensityScore(lat: number, lng: number): { score: number; neighbourhood: string } {
  for (const nb of NEIGHBOURHOOD_DENSITY) {
    if (lat >= nb.minLat && lat <= nb.maxLat && lng >= nb.minLng && lng <= nb.maxLng) {
      return { score: nb.density, neighbourhood: nb.name };
    }
  }
  // Outside defined boxes — use distance to centre as proxy
  const distKm = haversineKm(lat, lng, BERLIN_CENTER_LAT, BERLIN_CENTER_LNG);
  const score = Math.max(10, 60 - distKm * 4);
  return { score, neighbourhood: 'outer district' };
}

function getTimeOfDayScore(hour: number): { score: number; label: string } {
  // Morning rush
  if (hour >= 7 && hour < 9) return { score: 85, label: 'morning rush hour' };
  // Late morning / daytime
  if (hour >= 9 && hour < 12) return { score: 65, label: 'late morning' };
  // Lunch peak
  if (hour >= 12 && hour < 14) return { score: 75, label: 'lunch peak' };
  // Afternoon
  if (hour >= 14 && hour < 17) return { score: 55, label: 'afternoon' };
  // Evening rush
  if (hour >= 17 && hour < 20) return { score: 90, label: 'evening rush hour' };
  // Evening leisure
  if (hour >= 20 && hour < 23) return { score: 70, label: 'evening' };
  // Late night / early morning
  return { score: 20, label: 'night' };
}

function getDayOfWeekScore(dayOfWeek: number, hour: number): { score: number; label: string } {
  // dayOfWeek: 0=Sun, 1=Mon, …, 6=Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isSaturday = dayOfWeek === 6;

  if (isWeekday) return { score: 70, label: 'weekday' };
  if (isSaturday && hour >= 9 && hour < 19) return { score: 80, label: 'Saturday shopping' };
  if (isSaturday) return { score: 55, label: 'Saturday off-peak' };
  // Sunday
  return { score: 40, label: 'Sunday' };
}

function getCentrePenalty(lat: number, lng: number): { score: number; label: string } {
  const distKm = haversineKm(lat, lng, BERLIN_CENTER_LAT, BERLIN_CENTER_LNG);
  if (distKm < 2) return { score: 90, label: 'city centre' };
  if (distKm < 4) return { score: 70, label: 'inner city' };
  if (distKm < 7) return { score: 50, label: 'mid-ring' };
  if (distKm < 12) return { score: 30, label: 'outer ring' };
  return { score: 15, label: 'suburbs' };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreToLevel(score: number): DifficultyLevel {
  if (score < 40) return 'easy';
  if (score < 68) return 'medium';
  return 'hard';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate an estimated parking difficulty for a given spot at the
 * specified date/time (defaults to current time).
 */
export function calculateDifficulty(
  spot: ParkingSpot,
  _location: SearchLocation,
  now: Date = new Date(),
): DifficultyResult {
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  const density = getDensityScore(spot.lat, spot.lng);
  const timeScore = getTimeOfDayScore(hour);
  const dayScore = getDayOfWeekScore(dayOfWeek, hour);
  const centreScore = getCentrePenalty(spot.lat, spot.lng);
  const typeBaseline = TYPE_BASELINE[spot.type];

  // Weighted sum
  const weightedScore =
    density.score * 0.30 +
    timeScore.score * 0.25 +
    dayScore.score * 0.15 +
    typeBaseline * 0.20 +
    centreScore.score * 0.10;

  const finalScore = Math.round(clamp(weightedScore, 0, 100));
  const level = scoreToLevel(finalScore);

  const factors: string[] = [
    `${density.neighbourhood} (density)`,
    `${timeScore.label}`,
    `${dayScore.label}`,
    spot.type === 'garage' ? 'covered garage' : spot.type.replace('_', ' '),
    `${centreScore.label}`,
  ];

  return {
    level,
    score: finalScore,
    label: DIFFICULTY_LABEL_MAP[level],
    isEstimated: true,
    factors,
  };
}

const DIFFICULTY_LABEL_MAP: Record<DifficultyLevel, string> = {
  easy: 'Easy to park',
  medium: 'Moderate difficulty',
  hard: 'Hard to park',
};
