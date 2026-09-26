"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin,
  Navigation,
  Search,
  Check,
  RefreshCw,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

export interface WeatherData {
  city: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  temp: number;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  weatherText: string;
  weatherIcon: string;
  isDay: boolean;
  source: "ip" | "custom" | "fallback";
}

export interface WeatherPreference {
  mode: "ip" | "custom";
  city?: string;
  admin1?: string;
  country?: string;
  lat?: number;
  lon?: number;
}

interface WeatherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeather: WeatherData | null;
  preference: WeatherPreference;
  onSelectIpLocation: () => Promise<void>;
  onSelectCustomLocation: (item: {
    name: string;
    admin1?: string;
    country?: string;
    lat: number;
    lon: number;
  }) => Promise<void>;
  isRefreshing?: boolean;
}

const POPULAR_CITIES = [
  { name: "北京", admin1: "北京市", country: "中国", lat: 39.9042, lon: 116.4074 },
  { name: "上海", admin1: "上海市", country: "中国", lat: 31.2304, lon: 121.4737 },
  { name: "广州", admin1: "广东省", country: "中国", lat: 23.1291, lon: 113.2644 },
  { name: "深圳", admin1: "广东省", country: "中国", lat: 22.5431, lon: 114.0579 },
  { name: "杭州", admin1: "浙江省", country: "中国", lat: 30.2741, lon: 120.1551 },
  { name: "成都", admin1: "四川省", country: "中国", lat: 30.5728, lon: 104.0668 },
  { name: "武汉", admin1: "湖北省", country: "中国", lat: 30.5928, lon: 114.3055 },
  { name: "南京", admin1: "江苏省", country: "中国", lat: 32.0603, lon: 118.7969 },
  { name: "西安", admin1: "陕西省", country: "中国", lat: 34.3416, lon: 108.9398 },
  { name: "重庆", admin1: "重庆市", country: "中国", lat: 29.5630, lon: 106.5516 },
  { name: "香港", admin1: "香港", country: "中国", lat: 22.3193, lon: 114.1694 },
  { name: "东京", admin1: "东京都", country: "日本", lat: 35.6762, lon: 139.6503 },
  { name: "纽约", admin1: "New York", country: "美国", lat: 40.7128, lon: -74.006 },
  { name: "伦敦", admin1: "London", country: "英国", lat: 51.5074, lon: -0.1278 },
];

export function renderWeatherIcon(iconType: string, className = "h-5 w-5") {
  switch (iconType) {
    case "sun":
      return <Sun className={`${className} fill-amber-400 text-amber-500 animate-[spin_24s_linear_infinite]`} />;
    case "cloud-sun":
      return <CloudSun className={`${className} text-amber-400`} />;
    case "cloud":
      return <Cloud className={`${className} text-zinc-400`} />;
    case "cloud-fog":
      return <CloudFog className={`${className} text-zinc-400`} />;
    case "cloud-drizzle":
      return <CloudDrizzle className={`${className} text-blue-400`} />;
    case "cloud-rain":
      return <CloudRain className={`${className} text-blue-500`} />;
    case "cloud-snow":
      return <CloudSnow className={`${className} text-sky-300`} />;
    case "cloud-lightning":
      return <CloudLightning className={`${className} text-amber-500`} />;
    default:
      return <Sun className={`${className} fill-amber-400 text-amber-500`} />;
  }
}

interface CityResult {
  id?: number | string;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export function WeatherModal({
  open,
  onOpenChange,
  currentWeather,
  preference,
  onSelectIpLocation,
  onSelectCustomLocation,
  isRefreshing = false,
}: WeatherModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CityResult[]>([]);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Clear query on close
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSearchSubmitted(false);
      setLoadingAction(null);
    }
  }, [open]);

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/weather?action=search&keyword=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchSubmitted(true);
    } catch (err) {
      console.error("Search city failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchSubmitted(false);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChooseIp = async () => {
    setLoadingAction("ip");
    try {
      await onSelectIpLocation();
      onOpenChange(false);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChooseCity = async (city: {
    name: string;
    admin1?: string;
    country?: string;
    lat: number;
    lon: number;
  }) => {
    setLoadingAction(city.name);
    try {
      await onSelectCustomLocation(city);
      onOpenChange(false);
    } finally {
      setLoadingAction(null);
    }
  };

  const isIpMode = preference.mode === "ip";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <MapPin className="h-5 w-5 text-violet-500" />
            <span>天气定位设置</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            支持按当前网络 IP 自动识别城市，或自由搜索切换任意地区
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1 custom-scrollbar">
          {/* Current Status Card */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent p-4 dark:border-violet-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {currentWeather?.city || preference.city || "获取中..."}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isIpMode
                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                    }`}
                  >
                    {isIpMode ? (
                      <>
                        <Navigation className="h-2.5 w-2.5" />
                        IP 自动定位
                      </>
                    ) : (
                      <>
                        <MapPin className="h-2.5 w-2.5" />
                        自定义城市
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {currentWeather
                    ? `${currentWeather.weatherText} · 最高 ${currentWeather.tempMax}° / 最低 ${currentWeather.tempMin}°`
                    : "正在同步最新天气..."}
                </div>
              </div>

              {currentWeather && (
                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-500">
                    {renderWeatherIcon(currentWeather.weatherIcon, "h-6 w-6")}
                  </div>
                  <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
                    {currentWeather.temp}°
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action 1: Switch to IP location */}
          <div>
            <button
              onClick={handleChooseIp}
              disabled={isRefreshing || loadingAction === "ip"}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                isIpMode
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isIpMode
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {loadingAction === "ip" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xs sm:text-sm">按网络 IP 自动定位</div>
                  <div className="text-[11px] opacity-75">
                    根据你的网络出口 IP 智能获取所在位置与天气
                  </div>
                </div>
              </div>

              {isIpMode && (
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                  <span>使用中</span>
                </div>
              )}
            </button>
          </div>

          {/* Action 2: Search input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-zinc-400" />
              <span>搜索并修改城市位置</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    executeSearch(searchQuery);
                  }
                }}
                placeholder="输入城市名称，如：北京、杭州、Tokyo、London"
                className="w-full h-10 pl-9 pr-9 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-zinc-400" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Search results dropdown / list */}
            {searchSubmitted && (
              <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-lg max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 custom-scrollbar">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-400">
                    未找到相关城市，请尝试输入标准城市名或拼音/英文
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={`${item.id || item.name}-${item.latitude}-${item.longitude}`}
                      onClick={() =>
                        handleChooseCity({
                          name: item.name,
                          admin1: item.admin1,
                          country: item.country,
                          lat: item.latitude,
                          lon: item.longitude,
                        })
                      }
                      disabled={loadingAction === item.name}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {[item.admin1, item.country].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="shrink-0 text-zinc-300 group-hover:text-violet-500">
                        {loadingAction === item.name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action 3: Popular cities shortcut chips */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>热门城市快捷切换</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_CITIES.map((city) => {
                const isSelected =
                  !isIpMode &&
                  (preference.city === city.name || currentWeather?.city === city.name);
                return (
                  <button
                    key={city.name}
                    onClick={() => handleChooseCity(city)}
                    disabled={loadingAction === city.name}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30 font-semibold"
                        : "bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {loadingAction === city.name ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {city.name}
                      </span>
                    ) : (
                      city.name
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span>数据来源：Open-Meteo 全球气象服务</span>
          <button
            onClick={() => onOpenChange(false)}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
