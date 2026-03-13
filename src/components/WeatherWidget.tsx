import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Droplets } from 'lucide-react';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface Props {
  location: string;
  date: string;
  language: Language;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
}

const weatherIcons: Record<string, any> = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  default: Cloud,
};

const WeatherWidget = ({ location, date, language }: Props) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    // Use Open-Meteo (free, no API key needed) with geocoding
    const load = async () => {
      try {
        // Geocode location
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
        const geoData = await geoRes.json();
        if (!geoData.results?.length) return;

        const { latitude, longitude } = geoData.results[0];
        const targetDate = date.split('T')[0];

        // Get weather forecast
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weathercode&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`
        );
        const weatherData = await weatherRes.json();

        if (weatherData.daily) {
          const d = weatherData.daily;
          const code = d.weathercode?.[0] || 0;
          let desc = 'Clear';
          let icon = 'clear';
          if (code >= 61) { desc = t3(language, 'Regen', 'Pluie', 'Rain'); icon = 'rain'; }
          else if (code >= 71) { desc = t3(language, 'Sneeuw', 'Neige', 'Snow'); icon = 'snow'; }
          else if (code >= 1 && code <= 3) { desc = t3(language, 'Bewolkt', 'Nuageux', 'Cloudy'); icon = 'clouds'; }
          else if (code >= 45) { desc = t3(language, 'Mist', 'Brouillard', 'Fog'); icon = 'clouds'; }
          else { desc = t3(language, 'Zonnig', 'Ensoleillé', 'Sunny'); icon = 'clear'; }

          setWeather({
            temp: Math.round((d.temperature_2m_max[0] + d.temperature_2m_min[0]) / 2),
            description: desc,
            icon,
            humidity: d.precipitation_probability_max?.[0] || 0,
            wind: Math.round(d.wind_speed_10m_max?.[0] || 0),
          });
        }
      } catch {
        // Silently fail — weather is a nice-to-have
      }
    };

    if (location && date) load();
  }, [location, date, language]);

  if (!weather) return null;

  const Icon = weatherIcons[weather.icon] || weatherIcons.default;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-3 border border-border flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-heading font-bold text-foreground">{weather.temp}°C</span>
          <span className="text-xs text-muted-foreground">{weather.description}</span>
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" /> {weather.humidity}%</span>
          <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" /> {weather.wind} km/h</span>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherWidget;
