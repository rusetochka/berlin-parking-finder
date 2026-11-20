import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { UserParkingMark } from '@/types/parking';
import { USER_MARK_COLORS, USER_MARK_LABELS } from '@/types/parking';
import { useAppStore } from '@/stores/appStore';

interface Props {
  mark: UserParkingMark;
}

function createMarkIcon(mark: UserParkingMark): L.DivIcon {
  const color = USER_MARK_COLORS[mark.difficulty];
  return L.divIcon({
    className: '',
    html: `<div class="user-mark" style="background:${color}"><span>★</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export function UserMarkMarker({ mark }: Props) {
  const removeUserMark = useAppStore((s) => s.removeUserMark);
  const icon = createMarkIcon(mark);
  const date = new Date(mark.createdAt).toLocaleDateString();

  return (
    <Marker position={[mark.lat, mark.lng]} icon={icon}>
      <Popup minWidth={160} maxWidth={240}>
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
            Your parking mark
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px' }}>
            {USER_MARK_LABELS[mark.difficulty]} parking
          </div>
          {mark.note && (
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              {mark.note}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
            Added {date}
          </div>
          <button
            onClick={() => removeUserMark(mark.id)}
            style={{
              fontSize: '12px',
              color: '#f87171',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Remove
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
