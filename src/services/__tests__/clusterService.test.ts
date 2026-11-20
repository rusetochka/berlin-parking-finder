import { describe, it, expect } from 'vitest';
import { clusterParkingSpots } from '@/services/clusterService';
import type { ParkingSpot, SearchLocation } from '@/types/parking';

const LOCATION: SearchLocation = { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' };

function makeSpot(id: string, lat: number, lng: number, overrides: Partial<ParkingSpot> = {}): ParkingSpot {
  return {
    id,
    name: `Spot ${id}`,
    type: 'garage',
    lat,
    lng,
    address: `${id} Street, Berlin`,
    openingHours: '24/7',
    dataSource: 'mock',
    isLiveData: false,
    distanceMeters: undefined,
    ...overrides,
  };
}

describe('clusterParkingSpots', () => {
  it('returns empty array when given no spots', () => {
    expect(clusterParkingSpots([], LOCATION)).toEqual([]);
  });

  it('returns a single cluster for a single spot', () => {
    const spot = makeSpot('a', 52.5163, 13.3777);
    const clusters = clusterParkingSpots([spot], LOCATION);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].spots).toHaveLength(1);
  });

  it('groups spots within 150 m into the same cluster', () => {
    // Two spots ~10 m apart — should be in the same cluster
    const a = makeSpot('a', 52.5163, 13.3777);
    const b = makeSpot('b', 52.5164, 13.3778);
    const clusters = clusterParkingSpots([a, b], LOCATION);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].spots).toHaveLength(2);
  });

  it('creates separate clusters for spots >150 m apart', () => {
    // ~500 m separation
    const a = makeSpot('a', 52.5163, 13.3777);
    const b = makeSpot('b', 52.520, 13.3900);
    const clusters = clusterParkingSpots([a, b], LOCATION);
    expect(clusters).toHaveLength(2);
  });

  it('returns no more than 5 clusters', () => {
    // Create 10 widely-spaced spots
    const spots: ParkingSpot[] = [];
    for (let i = 0; i < 10; i++) {
      spots.push(makeSpot(`s${i}`, 52.50 + i * 0.05, 13.38));
    }
    const clusters = clusterParkingSpots(spots, LOCATION);
    expect(clusters.length).toBeLessThanOrEqual(5);
  });

  it('sorts clusters by spot count descending', () => {
    // Group A: 3 spots close together
    const groupA = [
      makeSpot('a1', 52.5163, 13.3777),
      makeSpot('a2', 52.5164, 13.3778),
      makeSpot('a3', 52.5165, 13.3779),
    ];
    // Group B: 1 spot far away
    const groupB = [makeSpot('b1', 52.54, 13.42)];

    const clusters = clusterParkingSpots([...groupB, ...groupA], LOCATION);
    expect(clusters[0].spots.length).toBeGreaterThanOrEqual(clusters[1]?.spots.length ?? 0);
  });

  it('includes correct label with spot count', () => {
    const spot = makeSpot('a', 52.5163, 13.3777);
    const clusters = clusterParkingSpots([spot], LOCATION);
    expect(clusters[0].label).toBe('1 parking spot');
  });

  it('pluralises label for multiple spots', () => {
    const a = makeSpot('a', 52.5163, 13.3777);
    const b = makeSpot('b', 52.5164, 13.3778);
    const clusters = clusterParkingSpots([a, b], LOCATION);
    expect(clusters[0].label).toBe('2 parking spots');
  });

  it('aggregates total capacity for spots with known capacity', () => {
    const a = makeSpot('a', 52.5163, 13.3777, { capacity: 50 });
    const b = makeSpot('b', 52.5164, 13.3778, { capacity: 100 });
    const clusters = clusterParkingSpots([a, b], LOCATION);
    expect(clusters[0].totalCapacity).toBe(150);
  });

  it('sets totalCapacity to null when no spots have capacity', () => {
    const a = makeSpot('a', 52.5163, 13.3777);
    const clusters = clusterParkingSpots([a], LOCATION);
    expect(clusters[0].totalCapacity).toBeNull();
  });

  it('detects free parking in cluster', () => {
    const a = makeSpot('a', 52.5163, 13.3777, { isFree: true });
    const clusters = clusterParkingSpots([a], LOCATION);
    expect(clusters[0].hasFreeParking).toBe(true);
  });

  it('sets hasFreeParking to false when no free spots', () => {
    const a = makeSpot('a', 52.5163, 13.3777, { isFree: false });
    const clusters = clusterParkingSpots([a], LOCATION);
    expect(clusters[0].hasFreeParking).toBe(false);
  });

  it('builds accurate typeCounts', () => {
    const a = makeSpot('a', 52.5163, 13.3777, { type: 'garage' });
    const b = makeSpot('b', 52.5164, 13.3778, { type: 'lot' });
    const c = makeSpot('c', 52.5165, 13.3779, { type: 'garage' });
    const clusters = clusterParkingSpots([a, b, c], LOCATION);
    expect(clusters[0].typeCounts).toMatchObject({ garage: 2, lot: 1 });
  });

  it('sets avgDifficulty to null when no spots have difficulty', () => {
    const spot = makeSpot('a', 52.5163, 13.3777);
    const clusters = clusterParkingSpots([spot], LOCATION);
    expect(clusters[0].avgDifficulty).toBeNull();
  });

  it('computes avgDifficulty when spots have difficulty scores', () => {
    const a = makeSpot('a', 52.5163, 13.3777, {
      difficulty: { level: 'easy', score: 20, label: 'Easy', isEstimated: true, factors: ['f'] },
    });
    const b = makeSpot('b', 52.5164, 13.3778, {
      difficulty: { level: 'hard', score: 80, label: 'Hard', isEstimated: true, factors: ['g'] },
    });
    const clusters = clusterParkingSpots([a, b], LOCATION);
    expect(clusters[0].avgDifficulty?.score).toBe(50);
    expect(clusters[0].avgDifficulty?.level).toBe('medium');
  });

  it('assigns cluster ids as cluster-0, cluster-1, ...', () => {
    const a = makeSpot('a', 52.5163, 13.3777);
    const b = makeSpot('b', 52.54, 13.42);
    const clusters = clusterParkingSpots([a, b], LOCATION);
    const ids = clusters.map((c) => c.id).sort();
    expect(ids).toContain('cluster-0');
    expect(ids).toContain('cluster-1');
  });
});
