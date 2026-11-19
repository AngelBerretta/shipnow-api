import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LivePosition } from '../lib/types';

const CHIVILCOY: [number, number] = [-34.8956, -60.0189];
const STALE_MS = 120_000;

const isStale = (position: LivePosition) => Date.now() - Date.parse(position.recordedAt) > STALE_MS;

// divIcon: los íconos por defecto de Leaflet se rompen con el bundler de Vite.
const markerIcon = (selected: boolean, stale: boolean) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;border:3px solid #1b232b;background:${stale ? '#cbd2d9' : '#f2c230'};box-shadow:0 0 0 ${selected ? 6 : 0}px rgba(242,194,48,.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

/** Encuadra a todos los repartidores solo cuando cambia su cantidad (no pelea con el zoom del usuario). */
function FitBounds({ positions }: { positions: LivePosition[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(L.latLngBounds(positions.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
  }, [positions.length, map]);
  return null;
}

interface Props {
  positions: LivePosition[];
  selectedId: string | null;
  trail: [number, number][];
  onSelect: (deliveryId: string) => void;
}

export default function LiveMap({ positions, selectedId, trail, onSelect }: Props) {
  return (
    <MapContainer center={CHIVILCOY} zoom={13} className="h-[28rem] w-full rounded-md border border-asphalt-200 lg:h-[34rem]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />
      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#b98c06', weight: 4 }} />}
      {positions.map((position) => (
        <Marker
          key={position.deliveryId}
          position={[position.lat, position.lng]}
          icon={markerIcon(position.deliveryId === selectedId, isStale(position))}
          eventHandlers={{ click: () => onSelect(position.deliveryId) }}
        >
          <Popup>
            {position.driverName} · {position.trackingCode ?? ''}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}