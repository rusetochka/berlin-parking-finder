import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { ParkingCluster } from '@/types/parking';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

interface Props {
  cluster: ParkingCluster;
  isSelected: boolean;
  onClick: () => void;
}

function createClusterIcon(cluster: ParkingCluster, isSelected: boolean): L.DivIcon {
  const level = cluster.avgDifficulty?.level ?? 'none';
  const cls = `parking-marker parking-marker--${level}${isSelected ? ' parking-marker--selected' : ''}`;
  const count = cluster.spots.length;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="font-size:11px;"><span>${count}</span></div>`,
    iconSize: isSelected ? [42, 42] : [36, 36],
    iconAnchor: isSelected ? [21, 42] : [18, 36],
    popupAnchor: [0, -38],
  });
}

function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function ClusterMarker({ cluster, isSelected, onClick }: Props) {
  const icon = createClusterIcon(cluster, isSelected);

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 100}
    >
      <Popup minWidth={220} maxWidth={300}>
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            {cluster.spots.length} parking spot{cluster.spots.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
            {cluster.address}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
            📍 {formatDistance(cluster.distanceMeters)}
            {' · '}
            🚶 {cluster.walkingMinutes} min walk
          </div>
          {cluster.totalCapacity != null && (
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
              🅿️ {cluster.totalCapacity.toLocaleString()} total spaces
            </div>
          )}
          <div style={{ marginTop: '6px' }}>
            <DifficultyBadge difficulty={cluster.avgDifficulty} showEstimated={true} />
          </div>
          {cluster.hasFreeParking && (
            <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px' }}>
              🟢 Free parking available
            </div>
          )}
          <div style={{ marginTop: '8px' }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${cluster.lat},${cluster.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#60a5fa' }}
            >
              🚗 Drive here
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
