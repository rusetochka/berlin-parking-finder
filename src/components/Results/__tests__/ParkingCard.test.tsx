import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParkingCard } from '@/components/Results/ParkingCard';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';
import type { ParkingSpot } from '@/types/parking';

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

function makeSpot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
  return {
    id: 'spot-1',
    name: 'Pankow Garage',
    type: 'garage',
    lat: 52.5163,
    lng: 13.3777,
    address: 'Müllerstraße 1, Berlin',
    openingHours: '24/7',
    dataSource: 'mock',
    isLiveData: false,
    distanceMeters: 350,
    walkingMinutes: 5,
    ...overrides,
  };
}

describe('ParkingCard', () => {
  it('renders the parking spot name', () => {
    render(<ParkingCard spot={makeSpot()} />);
    expect(screen.getByText('Pankow Garage')).toBeInTheDocument();
  });

  it('renders the parking type badge', () => {
    render(<ParkingCard spot={makeSpot()} />);
    expect(screen.getByText('Parking Garage')).toBeInTheDocument();
  });

  it('shows distance when distanceMeters is set', () => {
    render(<ParkingCard spot={makeSpot({ distanceMeters: 350 })} />);
    expect(screen.getByText(/350 m/)).toBeInTheDocument();
  });

  it('formats distance >1000 m as km', () => {
    render(<ParkingCard spot={makeSpot({ distanceMeters: 1500 })} />);
    expect(screen.getByText(/1\.5 km/)).toBeInTheDocument();
  });

  it('shows walking minutes', () => {
    render(<ParkingCard spot={makeSpot({ walkingMinutes: 5 })} />);
    expect(screen.getByText(/5 min/)).toBeInTheDocument();
  });

  it('shows fee description when provided', () => {
    render(<ParkingCard spot={makeSpot({ feeDescription: '€2/hr' })} />);
    expect(screen.getByText(/€2\/hr/)).toBeInTheDocument();
  });

  it('shows Free badge when isFree=true', () => {
    render(<ParkingCard spot={makeSpot({ isFree: true })} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('does not show Free badge when isFree=false', () => {
    render(<ParkingCard spot={makeSpot({ isFree: false })} />);
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
  });

  it('expands details when expand button is clicked', () => {
    render(<ParkingCard spot={makeSpot()} />);
    expect(screen.queryByText('Address')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more details' }));
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Müllerstraße 1, Berlin')).toBeInTheDocument();
  });

  it('collapses details when collapse button is clicked', () => {
    render(<ParkingCard spot={makeSpot()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show more details' }));
    expect(screen.getByText('Address')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Address')).not.toBeInTheDocument();
  });

  it('shows hours in expanded details — 24/7', () => {
    render(<ParkingCard spot={makeSpot({ openingHours: '24/7' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show more details' }));
    expect(screen.getByText('24 / 7')).toBeInTheDocument();
  });

  it('shows "Hours unknown" when openingHours is unknown', () => {
    render(<ParkingCard spot={makeSpot({ openingHours: 'unknown' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show more details' }));
    expect(screen.getByText('Hours unknown')).toBeInTheDocument();
  });

  it('shows capacity in expanded details when defined', () => {
    render(<ParkingCard spot={makeSpot({ capacity: 200 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show more details' }));
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('toggles selection on click', () => {
    render(<ParkingCard spot={makeSpot({ id: 'spot-1' })} />);
    const card = screen.getByText('Pankow Garage').closest('article')!;
    fireEvent.click(card);
    expect(useAppStore.getState().selectedSpotId).toBe('spot-1');
    fireEvent.click(card);
    expect(useAppStore.getState().selectedSpotId).toBeNull();
  });

  it('shows aria-pressed=true when the card is selected', () => {
    useAppStore.setState({ selectedSpotId: 'spot-1' });
    render(<ParkingCard spot={makeSpot({ id: 'spot-1' })} />);
    const article = screen.getByRole('button', { name: /show more details/i }).closest('article')!;
    expect(article).toHaveAttribute('aria-pressed', 'true');
  });
});
