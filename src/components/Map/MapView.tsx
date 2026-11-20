/**
 * MapView — the main Leaflet map panel.
 *
 * Shows:
 *  - OSM tile layer
 *  - Blue location pin for the selected search point
 *  - Colour-coded parking markers (green/amber/red by difficulty)
 *
 * Clicking on the map reverse-geocodes the click point and sets it as the
 * selected location, triggering a parking search.
 *
 * TODO: Switch tile provider to Stadia Maps or self-hosted tiles for production
 *       to comply with OSM tile usage policy (no heavy traffic on tile.osm.org).
 */

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { reverseGeocode } from '@/services/geocoding';
import {
  useAppStore,
  selectParkingClusters,
  selectSelectedLocation,
  selectSelectedSpotId,
  selectUserMarks,  selectMarkMode,} from '@/stores/appStore';
import { ClusterMarker } from './ClusterMarker';
import { LocationPin } from './LocationPin';
import { UserMarkMarker } from './UserMarkMarker';
import styles from './MapView.module.css';

// Berlin centre
const BERLIN_CENTER: [number, number] = [52.52, 13.405];
const DEFAULT_ZOOM = 12;

// ─── Click handler component ──────────────────────────────────────────────────

function MapClickHandler() {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const state = useAppStore.getState();

      if (state.markMode) {
        state.setAddMarkPending({ lat, lng });
        state.setMarkMode(false);
        return;
      }

      // Optimistically set with coordinates while geocoding
      const preliminary = { lat, lng, address: `${lat.toFixed(5)}° N ${lng.toFixed(5)}° E` };
      state.setSelectedLocation(preliminary);

      try {
        const result = await reverseGeocode(lat, lng);
        if (result) {
          const location = { lat, lng, address: result.displayName };
          state.setSelectedLocation(location);
          state.addRecentSearch(location);
        }
      } catch {
        // Keep the coordinate-based label if reverse geocoding fails
      }
    },
  });

  return null;
}

// ─── Auto-fit bounds when results change ──────────────────────────────────────

function BoundsFitter() {
  const map = useMapEvents({});
  const clusters = useAppStore(selectParkingClusters);
  const location = useAppStore(selectSelectedLocation);
  const prevResultsRef = useRef<number>(0);

  useEffect(() => {
    if (!location) return;
    if (clusters.length === 0) {
      map.setView([location.lat, location.lng], 14, { animate: true });
      prevResultsRef.current = 0;
      return;
    }

    // Only fit bounds when count changes (new search)
    if (clusters.length === prevResultsRef.current) return;
    prevResultsRef.current = clusters.length;

    const points: L.LatLngTuple[] = [
      [location.lat, location.lng],
      ...clusters.map((c): L.LatLngTuple => [c.lat, c.lng]),
    ];
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
  }, [clusters, location, map]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MapView() {
  const clusters = useAppStore(selectParkingClusters);
  const location = useAppStore(selectSelectedLocation);
  const selectedSpotId = useAppStore(selectSelectedSpotId);
  const setSelectedSpotId = useAppStore((s) => s.setSelectedSpotId);
  const userMarks = useAppStore(selectUserMarks);
  const markMode = useAppStore(selectMarkMode);
  const setMarkMode = useAppStore((s) => s.setMarkMode);

  return (
    <div className={styles.wrapper}>
      <MapContainer
        center={BERLIN_CENTER}
        zoom={DEFAULT_ZOOM}
        className={styles.map}
        zoomControl={true}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <MapClickHandler />
        <BoundsFitter />

        {/* Location pin */}
        {location && <LocationPin lat={location.lat} lng={location.lng} />}

        {/* Cluster markers */}
        {clusters.map((cluster) => (
          <ClusterMarker
            key={cluster.id}
            cluster={cluster}
            isSelected={cluster.id === selectedSpotId}
            onClick={() =>
              setSelectedSpotId(cluster.id === selectedSpotId ? null : cluster.id)
            }
          />
        ))}

        {/* User parking marks */}
        {userMarks.map((mark) => (
          <UserMarkMarker key={mark.id} mark={mark} />
        ))}
      </MapContainer>

      {/* Mark mode toggle button */}
      <button
        className={`${styles.markModeBtn}${markMode ? ` ${styles.markModeBtnActive}` : ''}`}
        onClick={() => setMarkMode(!markMode)}
        title={markMode ? 'Cancel: tap map to place mark' : 'Mark where you parked'}
        aria-pressed={markMode}
        aria-label={markMode ? 'Cancel marking mode' : 'Mark where you parked'}
      >
        <span className={styles.markModeDots}>
          <span style={{ background: '#4ade80' }} />
          <span style={{ background: '#fb923c' }} />
          <span style={{ background: '#f87171' }} />
        </span>
        {markMode ? 'Tap to place mark' : 'Mark parking'}
      </button>

      {/* Map hint */}
      {!location && !markMode && (
        <div className={styles.hint}>
          <span>Click to search an address · Mark where you parked</span>
        </div>
      )}
    </div>
  );
}
