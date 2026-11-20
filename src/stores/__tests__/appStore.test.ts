import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';
import type { ParkingSpot, UserParkingMark, SearchLocation } from '@/types/parking';

// Reset store state between tests
beforeEach(() => {
  useAppStore.setState({
    selectedLocation: null,
    recentSearches: [],
    parkingResults: [],
    parkingClusters: [],
    isLoading: false,
    error: null,
    selectedSpotId: null,
    viewMode: 'map',
    filters: DEFAULT_FILTERS,
    userMarks: [],
    addMarkPending: null,
    markMode: false,
  });
  // Silence localStorage errors in tests
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
});

const LOCATION: SearchLocation = { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' };

function makeSpot(id = 'spot-1'): ParkingSpot {
  return {
    id,
    name: 'Test',
    type: 'garage',
    lat: 52.5163,
    lng: 13.3777,
    address: 'Berlin',
    openingHours: '24/7',
    dataSource: 'mock',
    isLiveData: false,
  };
}

function makeMark(id = 'mark-1'): UserParkingMark {
  return { id, lat: 52.5, lng: 13.4, difficulty: 'easy', createdAt: Date.now() };
}

// ─── selectedLocation ──────────────────────────────────────────────────────

describe('setSelectedLocation', () => {
  it('sets selectedLocation and clears error', () => {
    useAppStore.getState().setError('previous error');
    useAppStore.getState().setSelectedLocation(LOCATION);
    const s = useAppStore.getState();
    expect(s.selectedLocation).toEqual(LOCATION);
    expect(s.error).toBeNull();
  });
});

describe('clearLocation', () => {
  it('clears location, results, clusters, and selectedSpotId', () => {
    useAppStore.setState({
      selectedLocation: LOCATION,
      parkingResults: [makeSpot()],
      parkingClusters: [],
      selectedSpotId: 'spot-1',
    });
    useAppStore.getState().clearLocation();
    const s = useAppStore.getState();
    expect(s.selectedLocation).toBeNull();
    expect(s.parkingResults).toEqual([]);
    expect(s.parkingClusters).toEqual([]);
    expect(s.selectedSpotId).toBeNull();
  });
});

// ─── recentSearches ────────────────────────────────────────────────────────

describe('addRecentSearch', () => {
  it('prepends new search to the list', () => {
    const loc2 = { lat: 52.53, lng: 13.40, address: 'Alexanderplatz' };
    useAppStore.getState().addRecentSearch(LOCATION);
    useAppStore.getState().addRecentSearch(loc2);
    const recent = useAppStore.getState().recentSearches;
    expect(recent[0].address).toBe('Alexanderplatz');
    expect(recent[1].address).toBe('Brandenburger Tor');
  });

  it('deduplicates by address', () => {
    useAppStore.getState().addRecentSearch(LOCATION);
    useAppStore.getState().addRecentSearch(LOCATION);
    expect(useAppStore.getState().recentSearches).toHaveLength(1);
  });

  it('caps the list at 5 entries', () => {
    for (let i = 0; i < 7; i++) {
      useAppStore.getState().addRecentSearch({ lat: 52.5 + i, lng: 13.4, address: `Place ${i}` });
    }
    expect(useAppStore.getState().recentSearches).toHaveLength(5);
  });

  it('moves a duplicate to the top', () => {
    useAppStore.getState().addRecentSearch(LOCATION);
    useAppStore.getState().addRecentSearch({ lat: 52.53, lng: 13.40, address: 'Alexanderplatz' });
    useAppStore.getState().addRecentSearch(LOCATION);
    const recent = useAppStore.getState().recentSearches;
    expect(recent[0].address).toBe('Brandenburger Tor');
    expect(recent).toHaveLength(2);
  });
});

// ─── parkingResults & clusters ─────────────────────────────────────────────

describe('setParkingResults', () => {
  it('replaces parkingResults', () => {
    const spots = [makeSpot('a'), makeSpot('b')];
    useAppStore.getState().setParkingResults(spots);
    expect(useAppStore.getState().parkingResults).toHaveLength(2);
  });
});

describe('setParkingClusters', () => {
  it('replaces parkingClusters', () => {
    const cluster = {
      id: 'cluster-0', lat: 52.5, lng: 13.4, address: 'Berlin', label: '1 spot',
      spots: [makeSpot()], distanceMeters: 100, walkingMinutes: 2,
      totalCapacity: null, spotsWithCapacity: 0, typeCounts: {}, avgDifficulty: null, hasFreeParking: false,
    };
    useAppStore.getState().setParkingClusters([cluster]);
    expect(useAppStore.getState().parkingClusters).toHaveLength(1);
  });
});

// ─── loading / error ────────────────────────────────────────────────────────

describe('setLoading', () => {
  it('updates isLoading', () => {
    useAppStore.getState().setLoading(true);
    expect(useAppStore.getState().isLoading).toBe(true);
    useAppStore.getState().setLoading(false);
    expect(useAppStore.getState().isLoading).toBe(false);
  });
});

describe('setError', () => {
  it('updates error message', () => {
    useAppStore.getState().setError('something went wrong');
    expect(useAppStore.getState().error).toBe('something went wrong');
  });

  it('can clear error with null', () => {
    useAppStore.getState().setError('oops');
    useAppStore.getState().setError(null);
    expect(useAppStore.getState().error).toBeNull();
  });
});

// ─── selectedSpotId ────────────────────────────────────────────────────────

describe('setSelectedSpotId', () => {
  it('sets selectedSpotId', () => {
    useAppStore.getState().setSelectedSpotId('abc');
    expect(useAppStore.getState().selectedSpotId).toBe('abc');
  });

  it('can clear selectedSpotId with null', () => {
    useAppStore.getState().setSelectedSpotId('abc');
    useAppStore.getState().setSelectedSpotId(null);
    expect(useAppStore.getState().selectedSpotId).toBeNull();
  });
});

// ─── viewMode ──────────────────────────────────────────────────────────────

describe('setViewMode', () => {
  it('updates viewMode', () => {
    useAppStore.getState().setViewMode('list');
    expect(useAppStore.getState().viewMode).toBe('list');
    useAppStore.getState().setViewMode('map');
    expect(useAppStore.getState().viewMode).toBe('map');
  });
});

// ─── filters ───────────────────────────────────────────────────────────────

describe('setFilters', () => {
  it('merges partial filter update', () => {
    useAppStore.getState().setFilters({ radiusMeters: 2000 });
    const f = useAppStore.getState().filters;
    expect(f.radiusMeters).toBe(2000);
    expect(f.sortBy).toBe(DEFAULT_FILTERS.sortBy);
  });

  it('can update multiple fields at once', () => {
    useAppStore.getState().setFilters({ openNow: true, sortBy: 'cheapest' });
    const f = useAppStore.getState().filters;
    expect(f.openNow).toBe(true);
    expect(f.sortBy).toBe('cheapest');
  });
});

describe('resetFilters', () => {
  it('restores DEFAULT_FILTERS', () => {
    useAppStore.getState().setFilters({ radiusMeters: 2000, openNow: true, sortBy: 'cheapest' });
    useAppStore.getState().resetFilters();
    expect(useAppStore.getState().filters).toEqual(DEFAULT_FILTERS);
  });
});

// ─── user marks ────────────────────────────────────────────────────────────

describe('addUserMark', () => {
  it('appends a mark to the list', () => {
    const mark = makeMark();
    useAppStore.getState().addUserMark(mark);
    expect(useAppStore.getState().userMarks).toHaveLength(1);
    expect(useAppStore.getState().userMarks[0]).toEqual(mark);
  });
});

describe('removeUserMark', () => {
  it('removes the mark with the given id', () => {
    useAppStore.getState().addUserMark(makeMark('a'));
    useAppStore.getState().addUserMark(makeMark('b'));
    useAppStore.getState().removeUserMark('a');
    const marks = useAppStore.getState().userMarks;
    expect(marks).toHaveLength(1);
    expect(marks[0].id).toBe('b');
  });

  it('does nothing when id is not found', () => {
    useAppStore.getState().addUserMark(makeMark('a'));
    useAppStore.getState().removeUserMark('z');
    expect(useAppStore.getState().userMarks).toHaveLength(1);
  });
});

describe('setAddMarkPending', () => {
  it('sets and clears addMarkPending', () => {
    useAppStore.getState().setAddMarkPending({ lat: 52.5, lng: 13.4 });
    expect(useAppStore.getState().addMarkPending).toEqual({ lat: 52.5, lng: 13.4 });
    useAppStore.getState().setAddMarkPending(null);
    expect(useAppStore.getState().addMarkPending).toBeNull();
  });
});

describe('setMarkMode', () => {
  it('toggles markMode', () => {
    useAppStore.getState().setMarkMode(true);
    expect(useAppStore.getState().markMode).toBe(true);
    useAppStore.getState().setMarkMode(false);
    expect(useAppStore.getState().markMode).toBe(false);
  });
});
