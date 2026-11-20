/**
 * Central Zustand store for the Berlin Parking app.
 *
 * Split into logical slices via a single unified store with named selectors.
 * State is kept flat and minimal — only what components actually need.
 *
 * Recent searches are persisted to localStorage (max 5 entries).
 */

import { create } from 'zustand';
import type { FilterState, ParkingCluster, ParkingSpot, SearchLocation, UserParkingMark } from '@/types/parking';
import { DEFAULT_FILTERS } from '@/types/parking';

const RECENT_SEARCHES_KEY = 'berlin-parking:recent-searches';
const USER_MARKS_KEY = 'berlin-parking:user-marks';
const MAX_RECENT = 5;

function loadRecentSearches(): SearchLocation[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as SearchLocation[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: SearchLocation[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

function loadUserMarks(): UserParkingMark[] {
  try {
    const raw = localStorage.getItem(USER_MARKS_KEY);
    return raw ? (JSON.parse(raw) as UserParkingMark[]) : [];
  } catch {
    return [];
  }
}

function saveUserMarks(marks: UserParkingMark[]): void {
  try {
    localStorage.setItem(USER_MARKS_KEY, JSON.stringify(marks));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

// ─── State shape ──────────────────────────────────────────────────────────────

export interface AppState {
  // ── Search ────────────────────────────────────────────────────────────────
  selectedLocation: SearchLocation | null;
  recentSearches: SearchLocation[];

  // ── Results ───────────────────────────────────────────────────────────────
  parkingResults: ParkingSpot[];
  parkingClusters: ParkingCluster[];
  isLoading: boolean;
  error: string | null;

  // ── Selection ─────────────────────────────────────────────────────────────
  selectedSpotId: string | null;

  // ── UI state ──────────────────────────────────────────────────────────────
  viewMode: 'map' | 'list';
  filters: FilterState;

  // ── User parking marks ────────────────────────────────────────────────────
  userMarks: UserParkingMark[];
  addMarkPending: { lat: number; lng: number } | null;
  markMode: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  setSelectedLocation: (location: SearchLocation) => void;
  clearLocation: () => void;
  addRecentSearch: (location: SearchLocation) => void;

  setParkingResults: (results: ParkingSpot[]) => void;
  setParkingClusters: (clusters: ParkingCluster[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setSelectedSpotId: (id: string | null) => void;

  setViewMode: (mode: 'map' | 'list') => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  setAddMarkPending: (pending: { lat: number; lng: number } | null) => void;
  addUserMark: (mark: UserParkingMark) => void;
  removeUserMark: (id: string) => void;
  setMarkMode: (active: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  selectedLocation: null,
  recentSearches: loadRecentSearches(),
  parkingResults: [],
  parkingClusters: [],
  isLoading: false,
  error: null,
  selectedSpotId: null,
  viewMode: 'map',
  filters: DEFAULT_FILTERS,
  userMarks: loadUserMarks(),
  addMarkPending: null,
  markMode: false,

  // ── Actions ───────────────────────────────────────────────────────────────

  setSelectedLocation: (location) => set({ selectedLocation: location, error: null }),

  clearLocation: () =>
    set({ selectedLocation: null, parkingResults: [], parkingClusters: [], selectedSpotId: null, error: null }),

  addRecentSearch: (location) =>
    set((state) => {
      // Deduplicate by address
      const filtered = state.recentSearches.filter((s) => s.address !== location.address);
      const updated = [location, ...filtered].slice(0, MAX_RECENT);
      saveRecentSearches(updated);
      return { recentSearches: updated };
    }),

  setParkingResults: (results) => set({ parkingResults: results }),

  setParkingClusters: (clusters) => set({ parkingClusters: clusters }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setSelectedSpotId: (id) => set({ selectedSpotId: id }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setAddMarkPending: (pending) => set({ addMarkPending: pending }),

  setMarkMode: (active) => set({ markMode: active }),

  addUserMark: (mark) =>
    set((state) => {
      const updated = [...state.userMarks, mark];
      saveUserMarks(updated);
      return { userMarks: updated, addMarkPending: null };
    }),

  removeUserMark: (id) =>
    set((state) => {
      const updated = state.userMarks.filter((m) => m.id !== id);
      saveUserMarks(updated);
      return { userMarks: updated };
    }),
}));

// ─── Convenience selectors ────────────────────────────────────────────────────
// Use these in components to avoid re-renders when unrelated state changes.

export const selectSelectedLocation = (s: AppState) => s.selectedLocation;
export const selectParkingResults = (s: AppState) => s.parkingResults;
export const selectParkingClusters = (s: AppState) => s.parkingClusters;
export const selectIsLoading = (s: AppState) => s.isLoading;
export const selectError = (s: AppState) => s.error;
export const selectFilters = (s: AppState) => s.filters;
export const selectViewMode = (s: AppState) => s.viewMode;
export const selectSelectedSpotId = (s: AppState) => s.selectedSpotId;
export const selectRecentSearches = (s: AppState) => s.recentSearches;
export const selectUserMarks = (s: AppState) => s.userMarks;
export const selectAddMarkPending = (s: AppState) => s.addMarkPending;
export const selectMarkMode = (s: AppState) => s.markMode;
