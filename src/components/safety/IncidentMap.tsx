import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Incident {
  id: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
  priority: string;
  status: string;
  incident_type_id: string | null;
  created_at: string;
}

interface IncidentMapProps {
  incidents: Incident[];
  getTypeName: (typeId: string | null) => string;
  height?: string;
  center?: [number, number];
  zoom?: number;
  singleIncident?: boolean;
}

const createIcon = (priority: string) => {
  const color = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px ${color}80;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const IncidentMap = ({ incidents, getTypeName, height = '200px', center, zoom = 15, singleIncident }: IncidentMapProps) => {
  const geoIncidents = useMemo(() => incidents.filter(i => i.lat && i.lng), [incidents]);

  if (geoIncidents.length === 0) return null;

  const mapCenter: [number, number] = center || [geoIncidents[0].lat!, geoIncidents[0].lng!];

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-border">
      <MapContainer center={mapCenter} zoom={singleIncident ? 17 : zoom} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {geoIncidents.map(inc => (
          <Marker key={inc.id} position={[inc.lat!, inc.lng!]} icon={createIcon(inc.priority)}>
            <Popup>
              <div className="text-xs">
                <strong>{getTypeName(inc.incident_type_id)}</strong>
                {inc.description && <p className="mt-1">{inc.description}</p>}
                <p className="text-muted-foreground mt-1">
                  {new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
