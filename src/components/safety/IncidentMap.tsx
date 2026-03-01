import { useMemo, useRef, useEffect } from 'react';
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

const getColor = (priority: string) =>
  priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#22c55e';

const IncidentMap = ({ incidents, getTypeName, height = '200px', center, zoom = 15, singleIncident }: IncidentMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const geoIncidents = useMemo(() => incidents.filter(i => i.lat && i.lng), [incidents]);

  useEffect(() => {
    if (!containerRef.current || geoIncidents.length === 0) return;

    if (!mapRef.current) {
      const mapCenter: [number, number] = center || [geoIncidents[0].lat!, geoIncidents[0].lng!];
      mapRef.current = L.map(containerRef.current, {
        center: mapCenter,
        zoom: singleIncident ? 17 : zoom,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    geoIncidents.forEach(inc => {
      const color = getColor(inc.priority);
      const marker = L.circleMarker([inc.lat!, inc.lng!], {
        radius: singleIncident ? 10 : 7,
        color: 'white',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }).addTo(mapRef.current!);

      const time = new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
      marker.bindTooltip(
        `<strong>${getTypeName(inc.incident_type_id)}</strong>${inc.description ? `<br/>${inc.description}` : ''}<br/><span style="color:#888">${time}</span>`,
        { direction: 'top', offset: [0, -8] }
      );

      markersRef.current.push(marker);
    });

    // Fit bounds if multiple
    if (geoIncidents.length > 1 && !singleIncident) {
      const bounds = L.latLngBounds(geoIncidents.map(i => [i.lat!, i.lng!]));
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoIncidents, getTypeName, center, zoom, singleIncident]);

  // Cleanup
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (geoIncidents.length === 0) return null;

  return (
    <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden border border-border" />
  );
};

export default IncidentMap;
