import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TaskMapProps {
  location: string;
  meetingPoint: string;
  directionsLabel: string;
}

const TaskMap = ({ location, meetingPoint, directionsLabel }: TaskMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  const searchQuery = meetingPoint !== location
    ? `${meetingPoint}, ${location}`
    : location;

  const encodedAddress = encodeURIComponent(searchQuery);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  const wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

  // Geocode the address
  useEffect(() => {
    setLoading(true);
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
        );
        const data = await res.json();
        if (data?.[0]) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (e) {
        console.error('Geocoding failed:', e);
      } finally {
        setLoading(false);
      }
    };
    geocode();
  }, [encodedAddress]);

  // Initialize map
  useEffect(() => {
    if (!coords || !mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Small delay to ensure DOM is ready and container has dimensions
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(coords, 15);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      L.marker(coords, { icon: redIcon })
        .addTo(map)
        .bindPopup(meetingPoint)
        .openPopup();

      // Force tiles to load correctly
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coords, meetingPoint]);

  return (
    <div className="space-y-4">
      {/* OpenStreetMap */}
      {loading ? (
        <div className="w-full h-48 md:h-80 rounded-xl overflow-hidden border border-border relative">
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full h-48 md:h-80 rounded-xl overflow-hidden border border-border z-0"
        />
      )}

      {/* Location info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{meetingPoint}</p>
          {meetingPoint !== location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Kies je favoriete navigatie-app om direct naar de locatie te rijden.
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-medium text-sm transition-all hover:opacity-90 shadow-card"
          style={{ backgroundColor: '#4285F4', color: '#fff', minHeight: '48px' }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
          Open in Google Maps
        </a>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-medium text-sm transition-all hover:opacity-90 shadow-card"
          style={{ backgroundColor: '#33ccff', color: '#fff', minHeight: '48px' }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-5.5c-.73 1.15-1.85 1.95-3.15 2.31-.18.05-.35.08-.53.08h-.64c-.18 0-.35-.03-.53-.08C9.85 13.45 8.73 12.65 8 11.5 7.27 10.35 7 9.18 7 8c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.18-.27 2.35-1 3.5z" />
          </svg>
          Open in Waze
        </a>
      </div>
    </div>
  );
};

export default TaskMap;
