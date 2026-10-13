"use client";

import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, CloudLightning, Snowflake, CloudFog, Loader2, MapPin } from "lucide-react";

// Fallback to Embassy of India premise location: Washington, D.C.
const DEFAULT_LAT = 38.8951;
const DEFAULT_LON = -77.0364;
const DEFAULT_CITY = "Washington, D.C.";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: number; code: number; city: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadWeather(lat: number, lon: number, cityName?: string) {
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        if (!weatherRes.ok) throw new Error("Weather fetch failed");
        const weatherData = await weatherRes.json();

        let city = cityName || "Washington, D.C.";
        if (!cityName) {
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              city = geoData.city || geoData.locality || "Local";
            }
          } catch {
            // Silently fall back
          }
        }

        if (isMounted) {
          setWeather({
            temp: Math.round(weatherData.current_weather.temperature),
            code: weatherData.current_weather.weathercode,
            city,
          });
        }
      } catch {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          loadWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // If user denies permission or browser blocks location, silently fall back without console.error
          loadWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
        },
        { timeout: 5000 }
      );
    } else {
      loadWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_CITY);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium animate-pulse">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-4 h-4 text-amber-500" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-4 h-4 text-slate-400" />;
    if (code === 45 || code === 48) return <CloudFog className="w-4 h-4 text-slate-400" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <Snowflake className="w-4 h-4 text-sky-300" />;
    if (code >= 95) return <CloudLightning className="w-4 h-4 text-purple-500" />;
    return <Cloud className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium hover:bg-slate-100 transition-colors cursor-default">
      <div className="flex items-center gap-1.5 text-slate-700">
        <MapPin className="w-3 h-3 text-slate-400" />
        <span>{weather.city}</span>
      </div>
      <div className="w-px h-3 bg-slate-300" />
      <div className="flex items-center gap-1.5 text-slate-700" title="Current Temperature">
        {getWeatherIcon(weather.code)}
        <span>{weather.temp}°C</span>
      </div>
    </div>
  );
}
