import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/components/Filters/FilterBar';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';

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

describe('FilterBar', () => {
  it('renders radius options', () => {
    render(<FilterBar />);
    expect(screen.getByText('300 m')).toBeInTheDocument();
    expect(screen.getByText('500 m')).toBeInTheDocument();
    expect(screen.getByText('1 km')).toBeInTheDocument();
  });

  it('renders parking type filter buttons', () => {
    render(<FilterBar />);
    expect(screen.getByText('Parking Garage')).toBeInTheDocument();
    expect(screen.getByText('Parking Lot')).toBeInTheDocument();
    expect(screen.getByText('Park & Ride')).toBeInTheDocument();
    expect(screen.getByText('Street Zone')).toBeInTheDocument();
  });

  it('renders the Open Now toggle', () => {
    render(<FilterBar />);
    expect(screen.getByText('Open now')).toBeInTheDocument();
  });

  it('renders sort options', () => {
    render(<FilterBar />);
    expect(screen.getByRole('option', { name: 'Nearest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cheapest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Easiest' })).toBeInTheDocument();
  });

  it('updates radius in the store when a radius chip is clicked', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText('500 m'));
    expect(useAppStore.getState().filters.radiusMeters).toBe(500);
  });

  it('toggles a parking type on/off', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText('Parking Garage'));
    expect(useAppStore.getState().filters.types).toContain('garage');
    fireEvent.click(screen.getByText('Parking Garage'));
    expect(useAppStore.getState().filters.types).not.toContain('garage');
  });

  it('toggles Open Now in the store', () => {
    render(<FilterBar />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(useAppStore.getState().filters.openNow).toBe(true);
    fireEvent.click(checkbox);
    expect(useAppStore.getState().filters.openNow).toBe(false);
  });

  it('updates sortBy when a sort option is selected', () => {
    render(<FilterBar />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cheapest' } });
    expect(useAppStore.getState().filters.sortBy).toBe('cheapest');
  });

  it('shows the Reset button when filters are non-default', () => {
    useAppStore.getState().setFilters({ radiusMeters: 500 });
    render(<FilterBar />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('does not show Reset button when filters are default', () => {
    render(<FilterBar />);
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('resets filters when Reset button is clicked', () => {
    useAppStore.getState().setFilters({ radiusMeters: 500, openNow: true, sortBy: 'cheapest' });
    render(<FilterBar />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(useAppStore.getState().filters).toEqual(DEFAULT_FILTERS);
  });
});
