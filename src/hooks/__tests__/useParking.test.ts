import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useParking } from '@/hooks/useParking';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';
import type { ParkingSpot, SearchLocation } from '@/types/parking';

vi.mock('@/services/parkingService', () => ({
  getNearbyParking: vi.fn(),
}));

vi.mock('@/services/clusterService', () => ({
  clusterParkingSpots: vi.fn(),
}));

import { getNearbyParking } from '@/services/parkingService';
import { clusterParkingSpots } from '@/services/clusterService';

const mockGetNearby = getNearbyParking as ReturnType<typeof vi.fn>;
const mockCluster = clusterParkingSpots as ReturnType<typeof vi.fn>;

const LOCATION: SearchLocation = { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' };

function makeSpot(id = 'spot-1'): ParkingSpot {
  return {
    id, name: 'Test', type: 'garage',
    lat: 52.5163, lng: 13.3777, address: 'Berlin',
    openingHours: '24/7', dataSource: 'mock', isLiveData: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
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
});

describe('useParking', () => {
  it('does nothing when no location is selected', () => {
    renderHook(() => useParking());
    expect(mockGetNearby).not.toHaveBeenCalled();
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('triggers a search when location is set', async () => {
    const spots = [makeSpot()];
    mockGetNearby.mockResolvedValue(spots);
    mockCluster.mockReturnValue([]);

    renderHook(() => useParking());
    act(() => { useAppStore.getState().setSelectedLocation(LOCATION); });

    await waitFor(() => expect(mockGetNearby).toHaveBeenCalledTimes(1));
    expect(mockGetNearby).toHaveBeenCalledWith(LOCATION, DEFAULT_FILTERS);
  });

  it('stores results in the store after successful search', async () => {
    const spots = [makeSpot()];
    mockGetNearby.mockResolvedValue(spots);
    mockCluster.mockReturnValue([]);

    renderHook(() => useParking());
    act(() => { useAppStore.getState().setSelectedLocation(LOCATION); });

    await waitFor(() => expect(useAppStore.getState().parkingResults).toHaveLength(1));
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(useAppStore.getState().error).toBeNull();
  });

  it('calls clusterParkingSpots with the results and location', async () => {
    const spots = [makeSpot()];
    mockGetNearby.mockResolvedValue(spots);
    mockCluster.mockReturnValue([]);

    renderHook(() => useParking());
    act(() => { useAppStore.getState().setSelectedLocation(LOCATION); });

    await waitFor(() => expect(mockCluster).toHaveBeenCalledTimes(1));
    expect(mockCluster).toHaveBeenCalledWith(spots, LOCATION);
  });

  it('sets error in store on search failure', async () => {
    mockGetNearby.mockRejectedValue(new Error('Overpass timeout'));

    renderHook(() => useParking());
    act(() => { useAppStore.getState().setSelectedLocation(LOCATION); });

    await waitFor(() => expect(useAppStore.getState().error).toBe('Overpass timeout'));
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('clears results and clusters when location is cleared', async () => {
    const spots = [makeSpot()];
    mockGetNearby.mockResolvedValue(spots);
    mockCluster.mockReturnValue([]);

    renderHook(() => useParking());
    act(() => { useAppStore.getState().setSelectedLocation(LOCATION); });
    await waitFor(() => expect(useAppStore.getState().parkingResults).toHaveLength(1));

    act(() => { useAppStore.getState().clearLocation(); });
    await waitFor(() => expect(useAppStore.getState().parkingResults).toHaveLength(0));
    expect(useAppStore.getState().parkingClusters).toHaveLength(0);
  });

  it('re-runs search when filters change', async () => {
    mockGetNearby.mockResolvedValue([]);
    mockCluster.mockReturnValue([]);

    renderHook(() => useParking());
    act(() => { useAppStore.getState().setSelectedLocation(LOCATION); });
    await waitFor(() => expect(mockGetNearby).toHaveBeenCalledTimes(1));

    act(() => { useAppStore.getState().setFilters({ radiusMeters: 500 }); });
    await waitFor(() => expect(mockGetNearby).toHaveBeenCalledTimes(2));
    expect(mockGetNearby.mock.calls[1][1].radiusMeters).toBe(500);
  });
});
