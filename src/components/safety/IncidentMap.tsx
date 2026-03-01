import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
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

const getColor = (priority: string) =>
  priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#22c55e';

const IncidentMap = ({ incidents, getTypeName, height = '200px', center, zoom = 15, singleIncident }: IncidentMapProps) => {
  const geoIncidents = useMemo(() => incidents.filter(i => i.lat && i.lng), [incidents]);

  if (geoIncidents.length === 0) return null;

  const mapCenter: [number, number] = center || [geoIncidents[0].lat!, geoIncidents[0].lng!];

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-border">
      <MapContainer center={mapCenter} zoom={singleIncident ? 17 : zoom} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {geoIncidents.map(inc => {
          const color = getColor(inc.priority);
          return (
            <CircleMarker
              key={inc.id}
              center={[inc.lat!, inc.lng!]}
              radius={singleIncident ? 10 : 7}
              pathOptions={{ color: 'white', weight: 2, fillColor: color, fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ fontSize: '11px' }}>
                  <strong>{getTypeName(inc.incident_type_id)}</strong>
                  {inc.description && <p style={{ margin: '4px 0 0' }}>{inc.description}</p>}
                  <p style={{ margin: '4px 0 0', color: '#888' }}>
                    {new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
