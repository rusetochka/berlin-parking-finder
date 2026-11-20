import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SearchBar } from '@/components/SearchBar/SearchBar';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_FILTERS } from '@/types/parking';

vi.mock('@/services/geocoding', () => ({
  geocodeAddress: vi.fn(),
}));

import { geocodeAddress } from '@/services/geocoding';
const mockGeocode = geocodeAddress as ReturnType<typeof vi.fn>;

const SUGGESTIONS = [
  { id: '1', displayName: 'Brandenburger Tor, Berlin', lat: 52.5163, lng: 13.3777 },
  { id: '2', displayName: 'Brandenburger Tor Museum', lat: 52.5165, lng: 13.378 },
];

function resetStore() {
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
}

beforeEach(() => {
  vi.useFakeTimers();
  mockGeocode.mockResolvedValue([]);
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** Flush debounce timer and resolve pending promises */
async function flush(ms = 350) {
  await act(async () => { vi.advanceTimersByTime(ms); });
  await act(async () => {});
}

function getInput() {
  return screen.getByRole('textbox', { name: 'Search address' });
}

describe('SearchBar', () => {
  it('renders the search input', () => {
    render(<SearchBar />);
    expect(getInput()).toBeInTheDocument();
  });

  it('shows suggestions after typing and debounce', async () => {
    mockGeocode.mockResolvedValue(SUGGESTIONS);
    render(<SearchBar />);

    fireEvent.change(getInput(), { target: { value: 'Brandenburger' } });
    await flush();

    // The dropdown splits the displayName at the first comma; query the short part
    expect(screen.getByText('Brandenburger Tor')).toBeInTheDocument();
  });

  it('does not show suggestions for short queries', async () => {
    render(<SearchBar />);
    fireEvent.change(getInput(), { target: { value: 'Br' } });
    await flush(400);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects a suggestion and sets selectedLocation in store', async () => {
    mockGeocode.mockResolvedValue(SUGGESTIONS);
    render(<SearchBar />);

    fireEvent.change(getInput(), { target: { value: 'Brandenburger' } });
    await flush();

    // Click the first option (uses onPointerDown)
    const option = screen.getAllByRole('option')[0];
    fireEvent.pointerDown(option);

    const location = useAppStore.getState().selectedLocation;
    expect(location?.lat).toBe(52.5163);
    expect(location?.lng).toBe(13.3777);
    expect(location?.address).toBe('Brandenburger Tor, Berlin');
  });

  it('adds the selection to recent searches', async () => {
    mockGeocode.mockResolvedValue(SUGGESTIONS);
    render(<SearchBar />);

    fireEvent.change(getInput(), { target: { value: 'Brandenburger' } });
    await flush();
    fireEvent.pointerDown(screen.getAllByRole('option')[0]);

    expect(useAppStore.getState().recentSearches).toHaveLength(1);
  });

  it('clears the input when the clear button is clicked', () => {
    useAppStore.setState({
      selectedLocation: { lat: 52.5163, lng: 13.3777, address: 'Brandenburger Tor' },
    });
    render(<SearchBar />);
    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);
    expect(useAppStore.getState().selectedLocation).toBeNull();
  });

  it('navigates suggestions with keyboard and selects on Enter', async () => {
    mockGeocode.mockResolvedValue(SUGGESTIONS);
    render(<SearchBar />);

    fireEvent.change(getInput(), { target: { value: 'Brandenburger' } });
    await flush();

    // Arrow down activates first item, Enter selects it
    fireEvent.keyDown(getInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(getInput(), { key: 'Enter' });

    const loc = useAppStore.getState().selectedLocation;
    expect(loc?.address).toBe('Brandenburger Tor, Berlin');
  });

  it('closes dropdown on Escape key', async () => {
    mockGeocode.mockResolvedValue(SUGGESTIONS);
    render(<SearchBar />);

    fireEvent.change(getInput(), { target: { value: 'Brandenburger' } });
    await flush();

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(getInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows recent searches when the input is focused with no query', async () => {
    useAppStore.setState({
      recentSearches: [{ lat: 52.53, lng: 13.40, address: 'Alexanderplatz, Berlin' }],
    });
    render(<SearchBar />);
    fireEvent.focus(getInput());

    // shortLabel is the part before the first comma
    expect(screen.getByText('Alexanderplatz')).toBeInTheDocument();
  });
});
