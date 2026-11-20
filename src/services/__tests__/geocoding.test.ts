import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeAddress, reverseGeocode } from '@/services/geocoding';

const MOCK_NOMINATIM_ITEM = {
  place_id: 42,
  display_name: 'Brandenburger Tor, Berlin, Deutschland',
  lat: '52.5163',
  lon: '13.3777',
  type: 'attraction',
  importance: 0.9,
};

function mockOkFetch(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function mockErrorFetch(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(null),
  });
}

describe('geocodeAddress', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an array of GeocodingResult', async () => {
    global.fetch = mockOkFetch([MOCK_NOMINATIM_ITEM]);
    const results = await geocodeAddress('Brandenburger Tor');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: '42',
      displayName: 'Brandenburger Tor, Berlin, Deutschland',
      lat: 52.5163,
      lng: 13.3777,
    });
  });

  it('returns empty array for empty Nominatim response', async () => {
    global.fetch = mockOkFetch([]);
    const results = await geocodeAddress('xyzzy');
    expect(results).toEqual([]);
  });

  it('throws when the response is not OK', async () => {
    global.fetch = mockErrorFetch(429);
    await expect(geocodeAddress('test')).rejects.toThrow('429');
  });

  it('includes Berlin bounding box in the URL', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await geocodeAddress('Alexanderplatz');
    expect(capturedUrl).toContain('viewbox=');
    expect(capturedUrl).toContain('bounded=1');
  });

  it('maps multiple results correctly', async () => {
    const items = [
      { ...MOCK_NOMINATIM_ITEM, place_id: 1, lat: '52.5', lon: '13.4' },
      { ...MOCK_NOMINATIM_ITEM, place_id: 2, lat: '52.6', lon: '13.5' },
    ];
    global.fetch = mockOkFetch(items);
    const results = await geocodeAddress('Berlin');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
  });
});

describe('reverseGeocode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a GeocodingResult for valid coordinates', async () => {
    global.fetch = mockOkFetch({
      ...MOCK_NOMINATIM_ITEM,
      place_id: 99,
    });
    const result = await reverseGeocode(52.5163, 13.3777);
    expect(result).not.toBeNull();
    expect(result?.lat).toBe(52.5163);
    expect(result?.lng).toBe(13.3777);
    expect(result?.id).toBe('99');
  });

  it('returns null when the response is not OK', async () => {
    global.fetch = mockErrorFetch(503);
    const result = await reverseGeocode(52.5, 13.4);
    expect(result).toBeNull();
  });

  it('returns null when response has no lat field', async () => {
    global.fetch = mockOkFetch({ place_id: 0, display_name: 'somewhere', lon: '13.4' });
    const result = await reverseGeocode(52.5, 13.4);
    expect(result).toBeNull();
  });
});
