import { describe, it, expect } from 'vitest';
import { calculateDifficulty } from '@/services/difficultyScorer';
import type { ParkingSpot, SearchLocation } from '@/types/parking';

const BERLIN_CENTER: SearchLocation = { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' };

function makeSpot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
  return {
    id: 'test-1',
    name: 'Test Spot',
    type: 'garage',
    lat: 52.5163,
    lng: 13.3777,
    address: 'Berlin',
    openingHours: '24/7',
    dataSource: 'mock',
    isLiveData: false,
    ...overrides,
  };
}

describe('calculateDifficulty', () => {
  it('returns a DifficultyResult with the correct shape', () => {
    const spot = makeSpot();
    const result = calculateDifficulty(spot, BERLIN_CENTER, new Date('2024-04-10T09:00:00'));

    expect(result.isEstimated).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['easy', 'medium', 'hard']).toContain(result.level);
    expect(result.label).toBeTypeOf('string');
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('scores a city-centre street_zone as hard during evening rush', () => {
    // 52.517 / 13.385 is inside Mitte neighbourhood
    const spot = makeSpot({ type: 'street_zone', lat: 52.517, lng: 13.385 });
    // Thursday 18:30 — evening rush hour
    const result = calculateDifficulty(spot, BERLIN_CENTER, new Date('2024-04-11T18:30:00'));
    expect(result.level).toBe('hard');
    expect(result.score).toBeGreaterThan(67);
  });

  it('scores a suburban garage at night as easy', () => {
    // Spandau coords (far west, low density)
    const spot = makeSpot({ type: 'garage', lat: 52.534, lng: 13.200 });
    // Sunday 03:00 — deep night
    const result = calculateDifficulty(spot, BERLIN_CENTER, new Date('2024-04-14T03:00:00'));
    expect(result.level).toBe('easy');
    expect(result.score).toBeLessThan(40);
  });

  it('scores garage lower than street_zone in the same location', () => {
    const location = { lat: 52.517, lng: 13.390 };
    const now = new Date('2024-04-10T15:00:00'); // Wednesday afternoon
    const garage = calculateDifficulty(makeSpot({ type: 'garage', ...location }), BERLIN_CENTER, now);
    const street = calculateDifficulty(makeSpot({ type: 'street_zone', ...location }), BERLIN_CENTER, now);
    expect(garage.score).toBeLessThan(street.score);
  });

  it('includes time-of-day info in factors', () => {
    const spot = makeSpot();
    const result = calculateDifficulty(spot, BERLIN_CENTER, new Date('2024-04-10T08:00:00'));
    const factorText = result.factors.join(' ');
    expect(factorText).toMatch(/rush hour|morning|lunch|afternoon|evening|night/i);
  });

  it('level boundary: score < 40 → easy', () => {
    // Use a distant, low-density location + garage + late night + Sunday
    const spot = makeSpot({ type: 'park_and_ride', lat: 52.535, lng: 13.200 });
    const result = calculateDifficulty(spot, BERLIN_CENTER, new Date('2024-04-14T02:00:00'));
    if (result.score < 40) expect(result.level).toBe('easy');
    else if (result.score < 68) expect(result.level).toBe('medium');
    else expect(result.level).toBe('hard');
  });

  it('score is always an integer', () => {
    const spot = makeSpot();
    const result = calculateDifficulty(spot, BERLIN_CENTER, new Date('2024-04-10T12:00:00'));
    expect(result.score).toBe(Math.round(result.score));
  });
});
