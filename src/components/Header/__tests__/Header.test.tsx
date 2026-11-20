import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/Header/Header';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';

// SearchBar internally calls useGeocoding which calls fetch — mock the geocoding module
vi.mock('@/services/geocoding', () => ({
  geocodeAddress: vi.fn().mockResolvedValue([]),
  reverseGeocode: vi.fn().mockResolvedValue(null),
}));

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

describe('Header', () => {
  it('renders the Berlin Parking brand name', () => {
    render(<Header />);
    expect(screen.getByText('Berlin Parking')).toBeInTheDocument();
  });

  it('renders Map and List view toggle buttons', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
  });

  it('Map button is active by default (aria-pressed=true)', () => {
    render(<Header />);
    const mapBtn = screen.getByRole('button', { name: /map/i });
    expect(mapBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to list view on List button click', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /list/i }));
    expect(useAppStore.getState().viewMode).toBe('list');
  });

  it('switches back to map view on Map button click', () => {
    useAppStore.setState({ viewMode: 'list' });
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /map/i }));
    expect(useAppStore.getState().viewMode).toBe('map');
  });

  it('toggles the difficulty legend open/closed', () => {
    render(<Header />);
    const legendBtn = screen.getByRole('button', { name: /difficulty colour guide/i });
    expect(screen.queryByText(/easy to park/i)).not.toBeInTheDocument();
    fireEvent.click(legendBtn);
    // After opening, legend content should appear
    expect(legendBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(legendBtn);
    expect(legendBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
