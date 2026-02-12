import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Trash2, Clock, Navigation, Search, ExternalLink, Loader2 } from 'lucide-react';
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
    clickMap: 'Klik op de kaart of zoek een adres om een punt toe te voegen',
    waypointLabel: 'Naam punt',
    arrivalTime: 'Aankomsttijd',
    description: 'Beschrijving',
    removeWaypoint: 'Verwijderen',
    routeTitle: 'Route titel',
    noWaypoints: 'Nog geen waypoints. Zoek een adres of klik op de kaart.',
    searchPlaceholder: 'Zoek een adres...',
    searching: 'Zoeken...',
    addAddress: 'Voeg toe',
    openInGoogleMaps: 'Google Maps',
    openInWaze: 'Waze',
    navigateRoute: 'Navigeer volledige route',
  },
  fr: {
    addWaypoint: 'Ajouter un point',
    clickMap: 'Cliquez sur la carte ou recherchez une adresse',
    waypointLabel: 'Nom du point',
    arrivalTime: "Heure d'arrivée",
    description: 'Description',
    removeWaypoint: 'Supprimer',
    routeTitle: 'Titre de la route',
    noWaypoints: 'Pas encore de waypoints. Recherchez une adresse ou cliquez sur la carte.',
    searchPlaceholder: 'Rechercher une adresse...',
    searching: 'Recherche...',
    addAddress: 'Ajouter',
    openInGoogleMaps: 'Google Maps',
    openInWaze: 'Waze',
    navigateRoute: 'Naviguer la route complète',
  },
  en: {
    addWaypoint: 'Add waypoint',
    clickMap: 'Click the map or search an address to add a waypoint',
    waypointLabel: 'Waypoint name',
    arrivalTime: 'Arrival time',
    description: 'Description',
    removeWaypoint: 'Remove',
    routeTitle: 'Route title',
    noWaypoints: 'No waypoints yet. Search an address or click the map.',
    searchPlaceholder: 'Search an address...',
    searching: 'Searching...',
    addAddress: 'Add',
    openInGoogleMaps: 'Google Maps',
    openInWaze: 'Waze',
    navigateRoute: 'Navigate full route',
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

// Build Google Maps directions URL from waypoints
const buildGoogleMapsUrl = (waypoints: Waypoint[]) => {
  if (waypoints.length === 0) return '';
  if (waypoints.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${waypoints[0].lat},${waypoints[0].lng}`;
  }
  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const midpoints = waypoints.slice(1, -1);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
  if (midpoints.length > 0) {
    url += `&waypoints=${midpoints.map(w => `${w.lat},${w.lng}`).join('|')}`;
  }
  return url;
};

const buildWazeUrl = (waypoints: Waypoint[]) => {
  if (waypoints.length === 0) return '';
  const last = waypoints[waypoints.length - 1];
  return `https://waze.com/ul?ll=${last.lat},${last.lng}&navigate=yes`;
};

const RouteMapEditor = ({ waypoints, onChange, language, readOnly = false }: RouteMapEditorProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const l = labels[language];

  const [addressQuery, setAddressQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const geocodeAddress = async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=be,nl,fr,de,lu`
      );
      const data = await res.json();
      if (data?.[0]) {
        const newWp: Waypoint = {
          id: crypto.randomUUID(),
          label: query,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          sort_order: waypoints.length,
        };
        onChange([...waypoints, newWp]);
        setAddressQuery('');
        const map = mapInstanceRef.current;
        if (map) map.setView([newWp.lat, newWp.lng], 14);
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
    } finally {
      setSearching(false);
    }
  };

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
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update click handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || readOnly) return;
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
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (waypoints.length === 0) return;
    waypoints.forEach((wp, i) => {
      const marker = L.marker([wp.lat, wp.lng], { icon: markerIcon(i), draggable: !readOnly })
        .addTo(map)
        .bindPopup(`<b>${wp.label || `#${i + 1}`}</b>${wp.arrival_time ? `<br/>⏰ ${wp.arrival_time}` : ''}${wp.description ? `<br/>${wp.description}` : ''}`);
      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const updated = waypoints.map((w, idx) => idx === i ? { ...w, lat: pos.lat, lng: pos.lng } : w);
          onChange(updated);
        });
      }
      markersRef.current.push(marker);
    });
    const latlngs = waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);
    polylineRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 3, opacity: 0.8, dashArray: '8, 8' }).addTo(map);
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

  const googleMapsUrl = buildGoogleMapsUrl(waypoints);
  const wazeUrl = buildWazeUrl(waypoints);

  return (
    <div className="space-y-3">
      {/* Address search bar (editor mode) */}
      {!readOnly && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={addressQuery}
              onChange={e => setAddressQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && geocodeAddress(addressQuery)}
              placeholder={l.searchPlaceholder}
              className="pl-9 text-sm h-9"
            />
          </div>
          <Button
            size="sm"
            onClick={() => geocodeAddress(addressQuery)}
            disabled={!addressQuery.trim() || searching}
            className="h-9 px-3"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {l.addAddress}
          </Button>
        </div>
      )}

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

      {/* Navigation buttons */}
      {waypoints.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: '#4285F4', color: '#fff' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            {l.openInGoogleMaps}
          </a>
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: '#33ccff', color: '#fff' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-5.5c-.73 1.15-1.85 1.95-3.15 2.31-.18.05-.35.08-.53.08h-.64c-.18 0-.35-.03-.53-.08C9.85 13.45 8.73 12.65 8 11.5 7.27 10.35 7 9.18 7 8c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.18-.27 2.35-1 3.5z" />
            </svg>
            {l.openInWaze}
          </a>
        </div>
      )}

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
