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

export function DashboardWidget() {
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
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 select-none">
        {/* Left Card: Welcome / Daily Inspiration Banner */}
        <div className="w-full md:w-auto md:max-w-[440px] flex items-center justify-between overflow-hidden rounded-3xl border border-white/70 dark:border-white/15 bg-white/75 dark:bg-zinc-900/70 p-4 sm:p-4.5 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:border-violet-400/40">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Scenic Mountain Squircle Thumbnail */}
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl border border-white/50 dark:border-white/10 shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=300&auto=format&fit=crop"
                alt="Scenic Mountain"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>

            {/* Greeting & Subtitle */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white text-shadow-contrast">
                你好，欢迎回来！
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-tight text-shadow-contrast mt-0.5 line-clamp-1">
                收藏好用的网站，让工作更高效，生活更有趣。
              </p>
              {/* Pill Tag */}
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow-[0_2px_8px_rgba(139,92,246,0.35)]">
                  <Zap className="h-3 w-3 fill-current text-violet-200" />
                  <span>今日 · 继续探索</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Quote */}
          <div className="hidden sm:block text-right self-center pl-3 shrink-0">
            <p className="font-serif italic text-[11px] text-zinc-400 dark:text-zinc-500 select-none leading-tight">
              “ Better tools,
            </p>
            <p className="font-serif italic text-[11px] text-zinc-400 dark:text-zinc-500 select-none mt-0.5 leading-tight">
              A better you. ”
            </p>
          </div>
        </div>

        {/* Right Card: Weather & Clock Widget */}
        <div className="w-full md:w-auto md:max-w-[280px] flex items-center justify-between rounded-3xl border border-white/70 dark:border-white/15 bg-white/75 dark:bg-zinc-900/70 p-4 sm:p-4.5 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:border-violet-400/40">
          {/* Weather Block - Clickable to open location settings modal */}
          <div
            onClick={() => setModalOpen(true)}
            role="button"
            tabIndex={0}
            title="点击切换天气位置或按 IP 定位"
            className="group flex items-center gap-2.5 sm:gap-3 cursor-pointer p-1 -m-1 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all"
          >
            {/* Weather Icon with glowing effect */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-500 dark:text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {renderWeatherIcon(weatherData?.weatherIcon || "sun", "h-5 w-5")}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                  {weatherData ? `${weatherData.temp}°` : "--°"}
                </span>
                {isRefreshing && (
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-zinc-400" />
                )}
              </div>

              {/* City name with indicator */}
              <div className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium leading-tight mt-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                <span className="truncate max-w-[85px] sm:max-w-[100px]">
                  {weatherData?.city || (weatherPref.mode === "ip" ? "定位中..." : weatherPref.city || "本地")}
                </span>
                {weatherPref.mode === "ip" ? (
                  <Navigation className="h-2.5 w-2.5 shrink-0 opacity-70 text-emerald-500" />
                ) : (
                  <MapPin className="h-2.5 w-2.5 shrink-0 opacity-70 text-violet-500" />
                )}
              </div>

              {/* Status & Temp Range */}
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-tight truncate">
                {weatherData
                  ? `${weatherData.weatherText} ${weatherData.tempMin}° / ${weatherData.tempMax}°`
                  : "晴 18° / 28°"}
              </div>
            </div>
          </div>

          {/* Thin Vertical Divider */}
          <div className="h-9 w-px bg-zinc-200/80 dark:bg-white/10 mx-2.5 sm:mx-3 shrink-0" />

          {/* Digital Clock Block */}
          <div className="text-right pl-1 shrink-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono text-shadow-contrast leading-none">
              {timeStr}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-shadow-contrast whitespace-nowrap">
              {dateStr}
            </div>
          </div>
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
