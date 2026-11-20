// ─── Parking Entity Types ──────────────────────────────────────────────────

export type ParkingType = 'garage' | 'lot' | 'park_and_ride' | 'street_zone' | 'unknown';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type SortOption = 'nearest' | 'cheapest' | 'easiest';

/**
 * Opening hours for a parking location.
 * '24/7' means always open.
 * 'unknown' means we have no data.
 */
export type OpeningHours =
  | '24/7'
  | 'unknown'
  | {
      /** Human-readable schedule string, e.g. "Mon–Fri 07:00–22:00" */
      description: string;
      /** Parsed intervals for "open now" logic */
      intervals?: OpeningInterval[];
    };

export interface OpeningInterval {
  /** 0=Sun, 1=Mon … 6=Sat */
  daysOfWeek: number[];
  /** "HH:MM" 24-hour format */
  openTime: string;
  /** "HH:MM" 24-hour format */
  closeTime: string;
}

export interface DifficultyResult {
  level: DifficultyLevel;
  /** 0–100, higher = harder to park */
  score: number;
  /** Human-readable label shown in the UI */
  label: string;
  /** Always true; we never have live occupancy data in this MVP */
  isEstimated: true;
  /** Which heuristic factors contributed (for legend/tooltip) */
  factors: string[];
}

/**
 * Core parking location entity.
 * All instances in this MVP are backed by mock data;
 * the isLiveData flag is always false until a real data source is wired in.
 */
export interface ParkingSpot {
  id: string;
  name: string;
  type: ParkingType;
  lat: number;
  lng: number;
  address: string;
  /** Maximum vehicle capacity, if known */
  capacity?: number;
  /** true = free parking, false = paid, undefined = unknown */
  isFree?: boolean;
  /** Human-readable fee description, e.g. "€2/hr, max €15/day" */
  feeDescription?: string;
  openingHours: OpeningHours;
  /** Populated after a search — metres from selected location */
  distanceMeters?: number;
  /** Populated after a search — minutes walking at 80 m/min */
  walkingMinutes?: number;
  difficulty?: DifficultyResult;
  /**
   * Data source identifier.
   * 'mock' for bundled mock data.
   * 'osm' for Overpass / OpenStreetMap results.
   * TODO: extend when integrating real sources.
   */
  dataSource: 'mock' | 'osm' | 'berlin-open-data';
  /**
   * false = data is static / estimated (shown as disclaimer in UI).
   * true = real-time occupancy from a live API.
   * Always false in the current MVP.
   */
  isLiveData: boolean;
  /** Optional external URL for more info or booking */
  infoUrl?: string;
}

// ─── User Parking Marks ────────────────────────────────────────────────────

export type UserMarkDifficulty = 'easy' | 'moderate' | 'hard';

export const USER_MARK_COLORS: Record<UserMarkDifficulty, string> = {
  easy: '#4ade80',      // green
  moderate: '#fb923c',  // orange
  hard: '#f87171',      // red
};

export const USER_MARK_LABELS: Record<UserMarkDifficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

export interface UserParkingMark {
  id: string;
  lat: number;
  lng: number;
  difficulty: UserMarkDifficulty;
  note?: string;
  createdAt: number; // timestamp
}

// ─── Search & Filter Types ─────────────────────────────────────────────────

export interface SearchLocation {
  lat: number;
  lng: number;
  /** Display address or landmark name */
  address: string;
}

export interface FilterState {
  /** Search radius in metres */
  radiusMeters: number;
  /** Parking types to include; empty array = all */
  types: ParkingType[];
  openNow: boolean;
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: FilterState = {
  radiusMeters: 1000,
  types: [],
  openNow: false,
  sortBy: 'nearest',
};

// ─── Label Helpers ─────────────────────────────────────────────────────────

export const PARKING_TYPE_LABELS: Record<ParkingType, string> = {
  garage: 'Parking Garage',
  lot: 'Parking Lot',
  park_and_ride: 'Park & Ride',
  street_zone: 'Street Zone',
  unknown: 'Parking',
};

export const PARKING_TYPE_ICONS: Record<ParkingType, string> = {
  garage: '🏢',
  lot: '🅿️',
  park_and_ride: '🚇',
  street_zone: '🛣️',
  unknown: '🚗',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

// ─── Parking Cluster Types ─────────────────────────────────────────────────

export interface ParkingCluster {
  id: string;
  /** Centre of the cluster (average of spot positions) */
  lat: number;
  lng: number;
  /** Address of the spot closest to the cluster centre */
  address: string;
  /** Human-readable label, e.g. "5 parking spots near Alexanderplatz" */
  label: string;
  /** All individual spots in the cluster */
  spots: ParkingSpot[];
  /** Distance from the search location to the cluster centre (metres) */
  distanceMeters: number;
  /** Walking minutes from search location */
  walkingMinutes: number;
  /** Aggregated total capacity (sum of known capacities) */
  totalCapacity: number | null;
  /** Count of spots with known capacity */
  spotsWithCapacity: number;
  /** Breakdown of parking types, e.g. { garage: 2, lot: 3 } */
  typeCounts: Partial<Record<ParkingType, number>>;
  /** Dominant difficulty across the cluster */
  avgDifficulty: DifficultyResult | null;
  /** Whether any spot in the cluster is free */
  hasFreeParking: boolean;
}
