import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Trash2, GripVertical, Clock, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';

export interface Waypoint {
  id: string;
  label: string;
  description?: string;
  lat: number;
  lng: number;
  arrival_time?: string;
  sort_order: number;
}

const labels = {
  nl: {
    addWaypoint: 'Punt toevoegen',
    clickMap: 'Klik op de kaart om een punt toe te voegen',
    waypointLabel: 'Naam punt',
    arrivalTime: 'Aankomsttijd',
    description: 'Beschrijving',
    removeWaypoint: 'Verwijderen',
    routeTitle: 'Route titel',
    noWaypoints: 'Nog geen waypoints. Klik op de kaart om punten toe te voegen.',
  },
  fr: {
    addWaypoint: 'Ajouter un point',
    clickMap: 'Cliquez sur la carte pour ajouter un point',
    waypointLabel: 'Nom du point',
    arrivalTime: "Heure d'arrivée",
    description: 'Description',
    removeWaypoint: 'Supprimer',
    routeTitle: 'Titre de la route',
    noWaypoints: 'Pas encore de waypoints. Cliquez sur la carte pour ajouter des points.',
  },
  en: {
    addWaypoint: 'Add waypoint',
    clickMap: 'Click the map to add a waypoint',
    waypointLabel: 'Waypoint name',
    arrivalTime: 'Arrival time',
    description: 'Description',
    removeWaypoint: 'Remove',
    routeTitle: 'Route title',
    noWaypoints: 'No waypoints yet. Click the map to add points.',
  },
};

interface RouteMapEditorProps {
  waypoints: Waypoint[];
  onChange: (waypoints: Waypoint[]) => void;
  language: Language;
  readOnly?: boolean;
}

const markerIcon = (index: number, color: string = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `<div style="
      background: ${color};
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const RouteMapEditor = ({ waypoints, onChange, language, readOnly = false }: RouteMapEditorProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const l = labels[language];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { scrollWheelZoom: true }).setView([50.85, 4.35], 10);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newWp: Waypoint = {
          id: crypto.randomUUID(),
          label: '',
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          sort_order: waypoints.length,
        };
        onChange([...waypoints, newWp]);
      });
    }

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update click handler when waypoints change (for readOnly=false)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || readOnly) return;

    // Re-register click handler with latest waypoints
    map.off('click');
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newWp: Waypoint = {
        id: crypto.randomUUID(),
        label: '',
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        sort_order: waypoints.length,
      };
      onChange([...waypoints, newWp]);
    });
  }, [waypoints, onChange, readOnly]);

  // Update markers and polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    if (waypoints.length === 0) return;

    // Add markers
    waypoints.forEach((wp, i) => {
      const marker = L.marker([wp.lat, wp.lng], { icon: markerIcon(i), draggable: !readOnly })
        .addTo(map)
        .bindPopup(`<b>${wp.label || `#${i + 1}`}</b>${wp.arrival_time ? `<br/>⏰ ${wp.arrival_time}` : ''}${wp.description ? `<br/>${wp.description}` : ''}`);

      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const updated = waypoints.map((w, idx) =>
            idx === i ? { ...w, lat: pos.lat, lng: pos.lng } : w
          );
          onChange(updated);
        });
      }

      markersRef.current.push(marker);
    });

    // Draw polyline
    const latlngs = waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);
    polylineRef.current = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8,
      dashArray: '8, 8',
    }).addTo(map);

    // Fit bounds
    if (waypoints.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    } else {
      map.setView([waypoints[0].lat, waypoints[0].lng], 14);
    }
  }, [waypoints, readOnly]);

  const removeWaypoint = (id: string) => {
    onChange(waypoints.filter(w => w.id !== id).map((w, i) => ({ ...w, sort_order: i })));
  };

  const updateWaypoint = (id: string, updates: Partial<Waypoint>) => {
    onChange(waypoints.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-64 md:h-80 rounded-xl overflow-hidden border border-border z-0"
        />
        {!readOnly && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000]">
            <div className="bg-background/90 backdrop-blur text-xs text-muted-foreground px-3 py-1.5 rounded-lg border border-border inline-flex items-center gap-1.5">
              <Navigation className="w-3 h-3" />
              {l.clickMap}
            </div>
          </div>
        )}
      </div>

      {/* Waypoints list */}
      {!readOnly && waypoints.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">{l.noWaypoints}</p>
      )}

      {waypoints.length > 0 && (
        <div className="space-y-2">
          {waypoints.map((wp, i) => (
            <div key={wp.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-1">
                {i + 1}
              </div>
              {readOnly ? (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{wp.label || `Punt ${i + 1}`}</p>
                  {wp.arrival_time && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {wp.arrival_time}
                    </p>
                  )}
                  {wp.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{wp.description}</p>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <Input
                      value={wp.label}
                      onChange={e => updateWaypoint(wp.id, { label: e.target.value })}
                      placeholder={`${l.waypointLabel} ${i + 1}`}
                      className="text-sm h-8"
                    />
                    <Input
                      type="time"
                      value={wp.arrival_time || ''}
                      onChange={e => updateWaypoint(wp.id, { arrival_time: e.target.value })}
                      placeholder={l.arrivalTime}
                      className="text-sm h-8"
                    />
                  </div>
                  <Input
                    value={wp.description || ''}
                    onChange={e => updateWaypoint(wp.id, { description: e.target.value })}
                    placeholder={l.description}
                    className="text-sm h-8"
                  />
                </div>
              )}
              {!readOnly && (
                <button
                  onClick={() => removeWaypoint(wp.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RouteMapEditor;
