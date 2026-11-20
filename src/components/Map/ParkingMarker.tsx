import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { ParkingSpot } from '@/types/parking';
import { PARKING_TYPE_LABELS } from '@/types/parking';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

interface Props {
  spot: ParkingSpot;
  isSelected: boolean;
  onClick: () => void;
}

function createMarkerIcon(spot: ParkingSpot, isSelected: boolean): L.DivIcon {
  const level = spot.difficulty?.level ?? 'none';
  const cls = `parking-marker parking-marker--${level}${isSelected ? ' parking-marker--selected' : ''}`;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}"><span>P</span></div>`,
    iconSize: isSelected ? [38, 38] : [32, 32],
    iconAnchor: isSelected ? [19, 38] : [16, 32],
    popupAnchor: [0, -34],
  });
}

export function ParkingMarker({ spot, isSelected, onClick }: Props) {
  const icon = createMarkerIcon(spot, isSelected);

  return (
    <Marker
      position={[spot.lat, spot.lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup minWidth={200} maxWidth={280}>
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            {spot.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
            {PARKING_TYPE_LABELS[spot.type]}
          </div>
          {spot.distanceMeters !== undefined && (
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
              📍 {spot.distanceMeters < 1000
                ? `${Math.round(spot.distanceMeters)} m`
                : `${(spot.distanceMeters / 1000).toFixed(1)} km`}
              {' · '}
              🚶 {spot.walkingMinutes} min walk
            </div>
          )}
          <div style={{ marginTop: '6px' }}>
            <DifficultyBadge difficulty={spot.difficulty} showEstimated={true} />
          </div>
          {spot.feeDescription && (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              {spot.isFree ? '🟢 Free' : `💶 ${spot.feeDescription}`}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
