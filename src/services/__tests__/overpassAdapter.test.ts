import { describe, it, expect } from 'vitest';
import { buildOverpassQuery, parseOverpassResult } from '@/services/overpassAdapter';

// ─── buildOverpassQuery ───────────────────────────────────────────────────────

describe('buildOverpassQuery', () => {
  it('includes the lat, lng and radius in the query', () => {
    const query = buildOverpassQuery(52.5, 13.4, 500);
    expect(query).toContain('500,52.5,13.4');
  });

  it('requests json output format', () => {
    const query = buildOverpassQuery(52.5, 13.4, 500);
    expect(query).toContain('[out:json]');
  });

  it('requests amenity=parking nodes', () => {
    const query = buildOverpassQuery(52.5, 13.4, 500);
    expect(query).toContain('"amenity"="parking"');
  });

  it('requests park_ride=yes nodes', () => {
    const query = buildOverpassQuery(52.5, 13.4, 500);
    expect(query).toContain('"park_ride"="yes"');
  });
});

// ─── parseOverpassResult ──────────────────────────────────────────────────────

describe('parseOverpassResult', () => {
  it('returns empty array for no elements', () => {
    expect(parseOverpassResult({ elements: [] })).toEqual([]);
  });

  it('skips elements without coordinates', () => {
    const result = parseOverpassResult({
      elements: [{ type: 'way', id: 1, tags: { amenity: 'parking' } }],
    });
    expect(result).toHaveLength(0);
  });

  it('parses a basic node element', () => {
    const result = parseOverpassResult({
      elements: [
        {
          type: 'node',
          id: 123,
          lat: 52.5,
          lon: 13.4,
          tags: { amenity: 'parking', name: 'Test Garage' },
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('osm-node-123');
    expect(result[0].lat).toBe(52.5);
    expect(result[0].lng).toBe(13.4);
    expect(result[0].name).toBe('Test Garage');
    expect(result[0].dataSource).toBe('osm');
  });

  it('uses center coords for way elements', () => {
    const result = parseOverpassResult({
      elements: [
        {
          type: 'way',
          id: 456,
          center: { lat: 52.6, lon: 13.5 },
          tags: { amenity: 'parking' },
        },
      ],
    });
    expect(result[0].lat).toBe(52.6);
    expect(result[0].lng).toBe(13.5);
  });

  it('resolves type=garage for multi-storey parking', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 1, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', parking: 'multi-storey' },
      }],
    });
    expect(result[0].type).toBe('garage');
  });

  it('resolves type=lot for surface parking', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 2, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', parking: 'surface' },
      }],
    });
    expect(result[0].type).toBe('lot');
  });

  it('resolves type=park_and_ride when park_ride=yes', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 3, lat: 52.5, lon: 13.4,
        tags: { park_ride: 'yes' },
      }],
    });
    expect(result[0].type).toBe('park_and_ride');
  });

  it('resolves type=street_zone for street_side parking', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 4, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', parking: 'street_side' },
      }],
    });
    expect(result[0].type).toBe('street_zone');
  });

  it('defaults type=unknown for unrecognised tags', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 5, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking' },
      }],
    });
    expect(result[0].type).toBe('unknown');
  });

  it('parses fee=no as isFree=true', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 6, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', fee: 'no' },
      }],
    });
    expect(result[0].isFree).toBe(true);
  });

  it('parses fee=yes as isFree=false', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 7, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', fee: 'yes' },
      }],
    });
    expect(result[0].isFree).toBe(false);
  });

  it('parses capacity as number', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 8, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', capacity: '250' },
      }],
    });
    expect(result[0].capacity).toBe(250);
  });

  it('sets openingHours=24/7 when tag is 24/7', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 9, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', opening_hours: '24/7' },
      }],
    });
    expect(result[0].openingHours).toBe('24/7');
  });

  it('falls back to name "Unnamed Parking" when no name tag', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 10, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking' },
      }],
    });
    expect(result[0].name).toBe('Unnamed Parking');
  });

  it('uses operator tag as fallback name', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 11, lat: 52.5, lon: 13.4,
        tags: { amenity: 'parking', operator: 'APCOA' },
      }],
    });
    expect(result[0].name).toBe('APCOA');
  });

  it('builds address from addr tags', () => {
    const result = parseOverpassResult({
      elements: [{
        type: 'node', id: 12, lat: 52.5, lon: 13.4,
        tags: {
          amenity: 'parking',
          'addr:street': 'Unter den Linden',
          'addr:housenumber': '5',
          'addr:postcode': '10117',
          'addr:city': 'Berlin',
        },
      }],
    });
    expect(result[0].address).toContain('Unter den Linden');
    expect(result[0].address).toContain('5');
  });
});
