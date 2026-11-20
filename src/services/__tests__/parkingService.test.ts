import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haversineMetres, estimateWalkingMinutes, getNearbyParking } from '@/services/parkingService';
import type { FilterState, ParkingSpot, SearchLocation } from '@/types/parking';
import { DEFAULT_FILTERS } from '@/types/parking';

// ─── haversineMetres ──────────────────────────────────────────────────────────

describe('haversineMetres', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineMetres(52.5, 13.4, 52.5, 13.4)).toBe(0);
  });

  it('measures ~1000 m for roughly 0.009° latitude difference', () => {
    // ~111 km per degree of latitude → 0.009° ≈ 1 km
    const dist = haversineMetres(52.5, 13.4, 52.509, 13.4);
    expect(dist).toBeGreaterThan(900);
    expect(dist).toBeLessThan(1100);
  });

  it('is symmetric', () => {
    const a = haversineMetres(52.5, 13.4, 52.52, 13.42);
    const b = haversineMetres(52.52, 13.42, 52.5, 13.4);
    expect(a).toBeCloseTo(b, 2);
  });

  it('returns a positive value for different points', () => {
    expect(haversineMetres(52.5, 13.4, 52.6, 13.5)).toBeGreaterThan(0);
  });
});

// ─── estimateWalkingMinutes ───────────────────────────────────────────────────

describe('estimateWalkingMinutes', () => {
  it('returns 0 for 0 metres', () => {
    expect(estimateWalkingMinutes(0)).toBe(0);
  });

  it('returns 1 for 80 metres (1 min at 80 m/min)', () => {
    expect(estimateWalkingMinutes(80)).toBe(1);
  });

  it('returns 13 for ~1000 metres', () => {
    // 1000 / 80 = 12.5 → rounds to 13
    expect(estimateWalkingMinutes(1000)).toBe(13);
  });

  it('rounds correctly', () => {
    expect(estimateWalkingMinutes(40)).toBe(1);  // 0.5 → rounds to 1 (Math.round)
    expect(estimateWalkingMinutes(39)).toBe(0);  // 0.4875 → rounds to 0
  });
});

// ─── getNearbyParking ────────────────────────────────────────────────────────

const LOCATION: SearchLocation = { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' };

function makeSpot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
  return {
    id: 'spot-1',
    name: 'Test',
    type: 'garage',
    lat: 52.5163,
    lng: 13.3777,
    address: 'Berlin',
    openingHours: '24/7',
    dataSource: 'osm',
    isLiveData: false,
    ...overrides,
  };
}

vi.mock('@/services/overpassAdapter', () => ({
  fetchOverpassParking: vi.fn(),
}));

import { fetchOverpassParking } from '@/services/overpassAdapter';
const mockFetch = fetchOverpassParking as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getNearbyParking', () => {
  it('enriches spots with distanceMeters and walkingMinutes', async () => {
    mockFetch.mockResolvedValue([makeSpot()]);
    const results = await getNearbyParking(LOCATION, DEFAULT_FILTERS);
    expect(results[0].distanceMeters).toBeDefined();
    expect(results[0].walkingMinutes).toBeDefined();
  });

  it('enriches spots with difficulty', async () => {
    mockFetch.mockResolvedValue([makeSpot()]);
    const results = await getNearbyParking(LOCATION, DEFAULT_FILTERS);
    expect(results[0].difficulty).toBeDefined();
    expect(results[0].difficulty?.score).toBeGreaterThanOrEqual(0);
  });

  it('filters by radius', async () => {
    const nearSpot = makeSpot({ id: 'near', lat: 52.5163, lng: 13.3777 });
    // ~2.2 km away
    const farSpot = makeSpot({ id: 'far', lat: 52.536, lng: 13.380 });
    mockFetch.mockResolvedValue([nearSpot, farSpot]);
    const filters: FilterState = { ...DEFAULT_FILTERS, radiusMeters: 500 };
    const results = await getNearbyParking(LOCATION, filters);
    expect(results.every((s) => (s.distanceMeters ?? 0) <= 500)).toBe(true);
    expect(results.find((s) => s.id === 'near')).toBeDefined();
  });

  it('filters by type when types array is non-empty', async () => {
    mockFetch.mockResolvedValue([
      makeSpot({ id: 'g', type: 'garage' }),
      makeSpot({ id: 'l', type: 'lot' }),
    ]);
    const filters: FilterState = { ...DEFAULT_FILTERS, types: ['garage'] };
    const results = await getNearbyParking(LOCATION, filters);
    expect(results.every((s) => s.type === 'garage')).toBe(true);
    expect(results.find((s) => s.id === 'g')).toBeDefined();
    expect(results.find((s) => s.id === 'l')).toBeUndefined();
  });

  it('returns all types when types array is empty', async () => {
    mockFetch.mockResolvedValue([
      makeSpot({ id: 'g', type: 'garage' }),
      makeSpot({ id: 'l', type: 'lot' }),
    ]);
    const results = await getNearbyParking(LOCATION, DEFAULT_FILTERS);
    expect(results.length).toBe(2);
  });

  it('filters openNow — excludes closed spots', async () => {
    const openSpot = makeSpot({ id: 'open', openingHours: '24/7' });
    const closedSpot = makeSpot({
      id: 'closed',
      openingHours: {
        description: 'Mon-Fri 09:00-17:00',
        intervals: [
          { daysOfWeek: [1, 2, 3, 4, 5], openTime: '09:00', closeTime: '17:00' },
        ],
      },
    });
    mockFetch.mockResolvedValue([openSpot, closedSpot]);
    const filters: FilterState = { ...DEFAULT_FILTERS, openNow: true };
    // Saturday midnight — closed spot should be excluded
    const satNight = new Date('2024-04-13T23:30:00'); // Saturday
    const results = await getNearbyParking(LOCATION, filters, satNight);
    expect(results.find((s) => s.id === 'open')).toBeDefined();
    expect(results.find((s) => s.id === 'closed')).toBeUndefined();
  });

  it('sorts by nearest when sortBy=nearest', async () => {
    const a = makeSpot({ id: 'a', lat: 52.5163, lng: 13.3777 }); // 0 m
    const b = makeSpot({ id: 'b', lat: 52.519, lng: 13.380 });   // ~350 m
    mockFetch.mockResolvedValue([b, a]);
    const results = await getNearbyParking(LOCATION, { ...DEFAULT_FILTERS, sortBy: 'nearest' });
    expect(results[0].id).toBe('a');
  });

  it('sorts by cheapest when sortBy=cheapest', async () => {
    const cheap = makeSpot({ id: 'cheap', feeDescription: '€1/hr', isFree: false });
    const expensive = makeSpot({ id: 'expensive', feeDescription: '€5/hr', isFree: false });
    mockFetch.mockResolvedValue([expensive, cheap]);
    const results = await getNearbyParking(LOCATION, { ...DEFAULT_FILTERS, sortBy: 'cheapest' });
    expect(results[0].id).toBe('cheap');
  });

  it('sorts free spots first when sortBy=cheapest', async () => {
    const free = makeSpot({ id: 'free', isFree: true });
    const paid = makeSpot({ id: 'paid', feeDescription: '€2/hr', isFree: false });
    mockFetch.mockResolvedValue([paid, free]);
    const results = await getNearbyParking(LOCATION, { ...DEFAULT_FILTERS, sortBy: 'cheapest' });
    expect(results[0].id).toBe('free');
  });

  it('sorts by easiest when sortBy=easiest', async () => {
    // Both spots at same nearby location; park_and_ride has lower TYPE_BASELINE (25) vs street_zone (70)
    const easy = makeSpot({ id: 'easy', type: 'park_and_ride', lat: 52.517, lng: 13.379 });
    const hard = makeSpot({ id: 'hard', type: 'street_zone', lat: 52.517, lng: 13.379 });
    mockFetch.mockResolvedValue([hard, easy]);
    const now = new Date('2024-04-11T18:30:00'); // Thursday evening rush
    const results = await getNearbyParking(LOCATION, { ...DEFAULT_FILTERS, sortBy: 'easiest' }, now);
    expect(results[0].id).toBe('easy');
  });

  it('returns empty array when fetchOverpassParking returns empty', async () => {
    mockFetch.mockResolvedValue([]);
    const results = await getNearbyParking(LOCATION, DEFAULT_FILTERS);
    expect(results).toEqual([]);
  });

  it('propagates errors from fetchOverpassParking', async () => {
    mockFetch.mockRejectedValue(new Error('API down'));
    await expect(getNearbyParking(LOCATION, DEFAULT_FILTERS)).rejects.toThrow('API down');
  });
});
