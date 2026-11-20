import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeocoding } from '@/hooks/useGeocoding';

vi.mock('@/services/geocoding', () => ({
  geocodeAddress: vi.fn(),
}));

import { geocodeAddress } from '@/services/geocoding';
const mockGeocode = geocodeAddress as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advance fake timers and flush all pending promises/state updates */
async function flush(ms = 350) {
  await act(async () => { vi.advanceTimersByTime(ms); });
  await act(async () => {});
}

const RESULTS = [
  { id: '1', displayName: 'Brandenburger Tor', lat: 52.5163, lng: 13.3777 },
];

describe('useGeocoding', () => {
  it('returns empty suggestions for short queries', () => {
    const { result } = renderHook(() => useGeocoding('ab'));
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('returns empty suggestions for empty query', () => {
    const { result } = renderHook(() => useGeocoding(''));
    expect(result.current.suggestions).toEqual([]);
  });

  it('debounces: does not call geocodeAddress immediately', () => {
    renderHook(() => useGeocoding('Brandenburger'));
    expect(mockGeocode).not.toHaveBeenCalled();
  });

  it('calls geocodeAddress after 350 ms debounce', async () => {
    mockGeocode.mockResolvedValue(RESULTS);
    renderHook(() => useGeocoding('Brandenburger'));

    await flush();

    expect(mockGeocode).toHaveBeenCalledTimes(1);
    expect(mockGeocode).toHaveBeenCalledWith('Brandenburger');
  });

  it('populates suggestions after successful search', async () => {
    mockGeocode.mockResolvedValue(RESULTS);
    const { result } = renderHook(() => useGeocoding('Brandenburger'));

    await flush();

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0].displayName).toBe('Brandenburger Tor');
    expect(result.current.isSearching).toBe(false);
  });

  it('sets error on geocoding failure', async () => {
    mockGeocode.mockRejectedValue(new Error('network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useGeocoding('Brandenburger'));

    await flush();

    expect(result.current.error).toBe('Could not fetch suggestions.');
    consoleSpy.mockRestore();
  });

  it('clears suggestions when query drops below min length', async () => {
    mockGeocode.mockResolvedValue(RESULTS);
    const { result, rerender } = renderHook(({ q }) => useGeocoding(q), {
      initialProps: { q: 'Brandenburger' },
    });

    await flush();
    expect(result.current.suggestions).toHaveLength(1);

    rerender({ q: 'Br' }); // too short
    expect(result.current.suggestions).toEqual([]);
  });

  it('cancels in-flight request when query changes rapidly', async () => {
    // Both calls settle immediately; only the last one should win
    mockGeocode
      .mockResolvedValueOnce(RESULTS) // first query "Alex"
      .mockResolvedValueOnce([]);     // second query "Alexander"

    const { result, rerender } = renderHook(({ q }) => useGeocoding(q), {
      initialProps: { q: 'Alex' },
    });

    // Fire debounce for "Alex"
    await flush();
    expect(mockGeocode).toHaveBeenCalledTimes(1);

    // Change query IMMEDIATELY before first promise resolves
    rerender({ q: 'Alexander' });
    // Fire debounce for "Alexander" — second call returns []
    await flush();
    expect(mockGeocode).toHaveBeenCalledTimes(2);

    // The last settled call returned [] so suggestions is empty
    expect(result.current.suggestions).toEqual([]);
  });
});
