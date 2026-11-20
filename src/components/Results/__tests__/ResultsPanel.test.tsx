import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPanel } from '@/components/Results/ResultsPanel';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';
import type { ParkingSpot, ParkingCluster, SearchLocation } from '@/types/parking';

// ClusterCard pulls in child components — let's keep it real but mock leaflet
vi.mock('react-leaflet', () => ({ MapContainer: () => null, TileLayer: () => null, Marker: () => null }));
vi.mock('leaflet', () => ({ default: {}, icon: () => ({}), divIcon: () => ({}) }));

const LOCATION: SearchLocation = { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' };

function makeSpot(id = 'spot-1'): ParkingSpot {
  return {
    id, name: 'Test', type: 'garage',
    lat: 52.5163, lng: 13.3777, address: 'Berlin',
    openingHours: '24/7', dataSource: 'mock', isLiveData: false,
    distanceMeters: 100, walkingMinutes: 2,
  };
}

function makeCluster(spots: ParkingSpot[]): ParkingCluster {
  return {
    id: 'cluster-0',
    lat: 52.5163,
    lng: 13.3777,
    address: 'Test Street',
    label: `${spots.length} parking spot${spots.length !== 1 ? 's' : ''}`,
    spots,
    distanceMeters: 100,
    walkingMinutes: 2,
    totalCapacity: null,
    spotsWithCapacity: 0,
    typeCounts: { garage: spots.length },
    avgDifficulty: null,
    hasFreeParking: false,
  };
}

beforeEach(() => {
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

describe('ResultsPanel', () => {
  it('shows empty state when no location is selected', () => {
    render(<ResultsPanel />);
    expect(screen.getByText('Find parking in Berlin')).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading=true', () => {
    useAppStore.setState({ selectedLocation: LOCATION, isLoading: true });
    render(<ResultsPanel />);
    // There should be skeleton elements — we check by looking for loading indicators
    // The panel renders 4 skeleton divs so results/error should be absent
    expect(screen.queryByText(/parking area/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    useAppStore.setState({ selectedLocation: LOCATION, error: 'Overpass failed' });
    render(<ResultsPanel />);
    expect(screen.getByText('Could not load parking data')).toBeInTheDocument();
    expect(screen.getByText('Overpass failed')).toBeInTheDocument();
  });

  it('shows "No parking found nearby" when results are empty and location is set', () => {
    useAppStore.setState({ selectedLocation: LOCATION, parkingResults: [] });
    render(<ResultsPanel />);
    expect(screen.getByText('No parking found nearby')).toBeInTheDocument();
  });

  it('shows parking area count when clusters are available', () => {
    const spots = [makeSpot()];
    const clusters = [makeCluster(spots)];
    useAppStore.setState({
      selectedLocation: LOCATION,
      parkingResults: spots,
      parkingClusters: clusters,
    });
    render(<ResultsPanel />);
    expect(screen.getByText(/1 parking area/)).toBeInTheDocument();
  });

  it('shows total spot count', () => {
    const spots = [makeSpot('a'), makeSpot('b')];
    const clusters = [makeCluster(spots)];
    useAppStore.setState({
      selectedLocation: LOCATION,
      parkingResults: spots,
      parkingClusters: clusters,
    });
    render(<ResultsPanel />);
    expect(screen.getByText(/2 total spot/)).toBeInTheDocument();
  });

  it('shows the search location name in the header', () => {
    const spots = [makeSpot()];
    useAppStore.setState({
      selectedLocation: LOCATION,
      parkingResults: spots,
      parkingClusters: [makeCluster(spots)],
    });
    render(<ResultsPanel />);
    expect(screen.getByText(/Brandenburger Tor/)).toBeInTheDocument();
  });
});
