import { Marker } from 'react-leaflet';
import L from 'leaflet';

interface Props {
  lat: number;
  lng: number;
}

const LOCATION_ICON = L.divIcon({
  className: '',
  html: '<div class="location-pin"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export function LocationPin({ lat, lng }: Props) {
  return <Marker position={[lat, lng]} icon={LOCATION_ICON} zIndexOffset={2000} />;
}
