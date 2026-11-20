/**
 * useGeocoding — debounced address autocomplete via Nominatim.
 *
 * Returns a list of GeocodingResult suggestions and a loading flag.
 * Debounces the search by 350 ms to respect Nominatim's usage policy.
 */

import { useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '@/services/geocoding';
import type { GeocodingResult } from '@/types/geocoding';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

interface UseGeocodingResult {
  suggestions: GeocodingResult[];
  isSearching: boolean;
  error: string | null;
}

export function useGeocoding(query: string): UseGeocodingResult {
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      let cancelled = false;
      setIsSearching(true);
      setError(null);

      geocodeAddress(query)
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError('Could not fetch suggestions.');
            console.error('Geocoding error:', err);
          }
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });

      return () => {
        cancelled = true;
      };
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { suggestions, isSearching, error };
}
