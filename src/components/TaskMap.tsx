import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

// Fix default marker icon issue in Leaflet + bundlers
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface TaskMapProps {
  location: string;
  meetingPoint: string;
  directionsLabel: string;
}

const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
};

const TaskMap = ({ location, meetingPoint, directionsLabel }: TaskMapProps) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState(false);

  const searchQuery = meetingPoint !== location
    ? `${meetingPoint}, ${location}`
    : location;

  useEffect(() => {
    const geocode = async () => {
      try {
        // Use Nominatim (OpenStreetMap) geocoding - free, no API key needed
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
          { headers: { 'Accept': 'application/json' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          // Try with just the location (without meeting point)
          const fallbackResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
            { headers: { 'Accept': 'application/json' } }
          );
          const fallbackData = await fallbackResponse.json();
          if (fallbackData && fallbackData.length > 0) {
            setCoords({ lat: parseFloat(fallbackData[0].lat), lng: parseFloat(fallbackData[0].lon) });
          } else {
            setError(true);
          }
        }
      } catch {
        setError(true);
      }
    };
    geocode();
  }, [searchQuery, location]);

  const getDirectionsUrl = () => {
    if (coords) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchQuery)}`;
  };

  if (error) {
    return (
      <div>
        <div className="rounded-xl border border-border bg-muted/30 aspect-[16/9] flex items-center justify-center">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Navigation className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">{searchQuery}</p>
          </div>
        </div>
        <a
          href={getDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-warm"
        >
          <Navigation className="w-4 h-4" />
          {directionsLabel}
        </a>
      </div>
    );
  }

  if (!coords) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 aspect-[16/9] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-border aspect-[16/9]">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap lat={coords.lat} lng={coords.lng} />
          <Marker position={[coords.lat, coords.lng]} icon={redIcon}>
            <Popup>
              <strong>{meetingPoint}</strong>
              <br />
              {location}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <a
        href={getDirectionsUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-warm"
      >
        <Navigation className="w-4 h-4" />
        {directionsLabel}
      </a>
    </div>
  );
};

export default TaskMap;
