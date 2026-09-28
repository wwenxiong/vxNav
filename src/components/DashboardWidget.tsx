"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Zap, MapPin, Navigation, RefreshCw } from "lucide-react";
import {
  WeatherModal,
  WeatherData,
  WeatherPreference,
  renderWeatherIcon,
} from "./WeatherModal";

const STORAGE_PREF_KEY = "nav_weather_preference";
const STORAGE_CACHE_KEY = "nav_weather_cached_data";

export function DashboardWidget({ className = "" }: { className?: string }) {
  const [timeStr, setTimeStr] = useState("12:38");
  const [dateStr, setDateStr] = useState("9月26日 周五");

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherPref, setWeatherPref] = useState<WeatherPreference>({
    mode: "ip",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Time updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setTimeStr(`${hours}:${minutes}`);

      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const weekday = weekdays[now.getDay()];
      const month = now.getMonth() + 1;
      const day = now.getDate();
      setDateStr(`${month}月${day}日 ${weekday}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather based on current preference
  const loadWeather = useCallback(async (pref: WeatherPreference) => {
    setIsRefreshing(true);
    try {
      let url = "/api/weather?action=ip";
      if (pref.mode === "custom" && pref.lat != null && pref.lon != null) {
        url = `/api/weather?action=coords&lat=${pref.lat}&lon=${pref.lon}&city=${encodeURIComponent(
          pref.city || "自定义位置"
        )}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data: WeatherData = await res.json();
        setWeatherData(data);
        try {
          localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.error("Failed to load weather:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load preference and cache
  useEffect(() => {
    let initialPref: WeatherPreference = { mode: "ip" };
    try {
      const savedPref = localStorage.getItem(STORAGE_PREF_KEY);
      if (savedPref) {
        initialPref = JSON.parse(savedPref);
        setWeatherPref(initialPref);
      }
      const cachedWeather = localStorage.getItem(STORAGE_CACHE_KEY);
      if (cachedWeather) {
        setWeatherData(JSON.parse(cachedWeather));
      }
    } catch {}

    loadWeather(initialPref);
  }, [loadWeather]);

  // Handler: Switch to IP location
  const handleSelectIpLocation = async () => {
    const newPref: WeatherPreference = { mode: "ip" };
    setWeatherPref(newPref);
    try {
      localStorage.setItem(STORAGE_PREF_KEY, JSON.stringify(newPref));
    } catch {}
    await loadWeather(newPref);
  };

  // Handler: Switch to Custom city
  const handleSelectCustomLocation = async (item: {
    name: string;
    admin1?: string;
    country?: string;
    lat: number;
    lon: number;
  }) => {
    const newPref: WeatherPreference = {
      mode: "custom",
      city: item.name,
      admin1: item.admin1,
      country: item.country,
      lat: item.lat,
      lon: item.lon,
    };
    setWeatherPref(newPref);
    try {
      localStorage.setItem(STORAGE_PREF_KEY, JSON.stringify(newPref));
    } catch {}
    await loadWeather(newPref);
  };

  return (
    <>
      {/* Weather & Clock Capsule Widget - Styled to match search bar size and design */}
      <div className={`relative flex items-center justify-between rounded-full border border-white/70 dark:border-white/15 bg-[var(--glass-nav-bg)] backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] px-3.5 sm:px-4 h-11 select-none transition-all hover:border-violet-400/40 shrink-0 ${className}`}>
        {/* Weather Info (Left side) - Clickable to open location settings modal */}
        <div
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          title="点击切换天气位置或按 IP 定位"
          className="group flex items-center gap-2 sm:gap-2.5 cursor-pointer py-1 pr-1 rounded-full hover:opacity-85 transition-opacity min-w-0"
        >
          {/* Weather Icon with glowing effect */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-500 dark:text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            {renderWeatherIcon(weatherData?.weatherIcon || "sun", "h-4 w-4")}
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {/* Temperature */}
            <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white font-mono leading-none">
              {weatherData ? `${weatherData.temp}°` : "--°"}
            </span>

            {/* City & Indicator */}
            <div className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-none">
              <span className="truncate max-w-[65px] sm:max-w-[85px] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {weatherData?.city || (weatherPref.mode === "ip" ? "定位中..." : weatherPref.city || "本地")}
              </span>
              {weatherPref.mode === "ip" ? (
                <Navigation className="h-2.5 w-2.5 shrink-0 opacity-75 text-emerald-500" />
              ) : (
                <MapPin className="h-2.5 w-2.5 shrink-0 opacity-75 text-violet-500" />
              )}
            </div>

            {/* Weather Text */}
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium hidden sm:inline leading-none">
              {weatherData?.weatherText || "晴"}
            </span>
          </div>
        </div>

        {/* Delicate Vertical Divider */}
        <div className="h-4.5 w-px bg-zinc-300/60 dark:bg-white/10 mx-2 shrink-0" />

        {/* Digital Clock & Date (Right side) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white font-mono text-shadow-contrast leading-none">
            {timeStr}
          </span>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-shadow-contrast whitespace-nowrap">
            {dateStr}
          </span>
        </div>
      </div>

      {/* Weather & Location Modal */}
      <WeatherModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentWeather={weatherData}
        preference={weatherPref}
        onSelectIpLocation={handleSelectIpLocation}
        onSelectCustomLocation={handleSelectCustomLocation}
        isRefreshing={isRefreshing}
      />
    </>
  );
}

export default DashboardWidget;
