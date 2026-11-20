/**
 * useParking — orchestrates a parking search.
 *
 * Watches selectedLocation and filters in the store.
 * When either changes, fires a new search via parkingService and writes
 * results back to the store.
 */

import { useEffect, useRef } from 'react';
import { getNearbyParking } from '@/services/parkingService';
import { clusterParkingSpots } from '@/services/clusterService';
import {
  useAppStore,
  selectFilters,
  selectSelectedLocation,
} from '@/stores/appStore';

export function useParking(): void {
  const location = useAppStore(selectSelectedLocation);
  const filters = useAppStore(selectFilters);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const setParkingResults = useAppStore((s) => s.setParkingResults);
  const setParkingClusters = useAppStore((s) => s.setParkingClusters);

  // Cancel in-flight requests when a new one starts
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!location) {
      setParkingResults([]);
      setParkingClusters([]);
      return;
    }

    // Cancel the previous search
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    setLoading(true);
    setError(null);

    getNearbyParking(location, filters)
      .then((results) => {
        if (!cancelled) {
          setParkingResults(results);
          setParkingClusters(clusterParkingSpots(results, location));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load parking data.';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, filters]);
}
