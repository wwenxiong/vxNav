import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("192.168.") || ip.startsWith("10.")) return true;
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    const sec = parseInt(parts[1], 10);
    if (sec >= 16 && sec <= 31) return true;
  }
  return false;
}

function parseWeatherCode(code: number, isDay = 1): { text: string; icon: string } {
  switch (code) {
    case 0:
      return { text: "晴", icon: "sun" };
    case 1:
      return { text: "晴间多云", icon: isDay ? "cloud-sun" : "cloud" };
    case 2:
      return { text: "多云", icon: isDay ? "cloud-sun" : "cloud" };
    case 3:
      return { text: "阴", icon: "cloud" };
    case 45:
    case 48:
      return { text: "雾", icon: "cloud-fog" };
    case 51:
    case 53:
    case 55:
      return { text: "毛毛雨", icon: "cloud-drizzle" };
    case 56:
    case 57:
      return { text: "冻毛毛雨", icon: "cloud-drizzle" };
    case 61:
      return { text: "小雨", icon: "cloud-rain" };
    case 63:
      return { text: "中雨", icon: "cloud-rain" };
    case 65:
      return { text: "大雨", icon: "cloud-rain" };
    case 66:
    case 67:
      return { text: "冻雨", icon: "cloud-rain" };
    case 71:
      return { text: "小雪", icon: "cloud-snow" };
    case 73:
      return { text: "中雪", icon: "cloud-snow" };
    case 75:
      return { text: "大雪", icon: "cloud-snow" };
    case 77:
      return { text: "雪粒", icon: "cloud-snow" };
    case 80:
      return { text: "阵雨", icon: "cloud-rain" };
    case 81:
      return { text: "中阵雨", icon: "cloud-rain" };
    case 82:
      return { text: "强阵雨", icon: "cloud-rain" };
    case 85:
      return { text: "阵雪", icon: "cloud-snow" };
    case 86:
      return { text: "大阵雪", icon: "cloud-snow" };
    case 95:
      return { text: "雷阵雨", icon: "cloud-lightning" };
    case 96:
    case 99:
      return { text: "雷暴伴冰雹", icon: "cloud-lightning" };
    default:
      return { text: "晴", icon: "sun" };
  }
}

async function fetchLocationByIp(clientIp: string) {
  const queryIp = isPrivateIp(clientIp) ? "" : clientIp;

  // 1. Try ipwho.is
  try {
    const url = queryIp ? `https://ipwho.is/${queryIp}?lang=zh` : "https://ipwho.is/?lang=zh";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.success === true || data.latitude)) {
        return {
          city: data.city || data.region || data.country || "本地",
          region: data.region || "",
          country: data.country || "",
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        };
      }
    }
  } catch {
    // fallback
  }

  // 2. Try ip-api.com
  try {
    const url = queryIp
      ? `http://ip-api.com/json/${queryIp}?lang=zh-CN`
      : "http://ip-api.com/json/?lang=zh-CN";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success") {
        return {
          city: data.city || data.regionName || data.country || "本地",
          region: data.regionName || "",
          country: data.country || "",
          latitude: Number(data.lat),
          longitude: Number(data.lon),
        };
      }
    }
  } catch {
    // fallback
  }

  // 3. Fallback default (Beijing)
  return {
    city: "北京",
    region: "北京市",
    country: "中国",
    latitude: 39.9042,
    longitude: 116.4074,
  };
}

async function fetchWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 600 }, // 10 minutes cache
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo returned status ${res.status}`);
  }
  const data = await res.json();
  const current = data.current_weather || {};
  const daily = data.daily || {};

  const temp = Math.round(Number(current.temperature ?? 22));
  const tempMax = Math.round(Number(daily.temperature_2m_max?.[0] ?? temp + 3));
  const tempMin = Math.round(Number(daily.temperature_2m_min?.[0] ?? temp - 4));
  const weatherCode = Number(current.weathercode ?? 0);
  const isDay = Number(current.is_day ?? 1);
  const { text: weatherText, icon: weatherIcon } = parseWeatherCode(weatherCode, isDay);

  return {
    temp,
    tempMax,
    tempMin,
    weatherCode,
    weatherText,
    weatherIcon,
    isDay: Boolean(isDay),
    windSpeed: current.windspeed,
    updatedAt: current.time || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "ip";

  try {
    // Action: 搜索城市
    if (action === "search") {
      const keyword = searchParams.get("keyword")?.trim();
      if (!keyword) {
        return NextResponse.json({ results: [] });
      }

      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        keyword
      )}&count=10&language=zh&format=json`;
      const res = await fetch(geoUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return NextResponse.json({ results: [] });
      }

      const data = await res.json();
      interface GeoResultItem {
        id?: number | string;
        name: string;
        country?: string;
        admin1?: string;
        latitude: number;
        longitude: number;
      }
      const results = (data.results || []).map((item: GeoResultItem) => ({
        id: item.id,
        name: item.name,
        country: item.country || "",
        admin1: item.admin1 || "",
        latitude: item.latitude,
        longitude: item.longitude,
      }));

      return NextResponse.json({ results });
    }

    // Action: 按指定经纬度和城市名获取天气
    if (action === "coords") {
      const latStr = searchParams.get("lat");
      const lonStr = searchParams.get("lon");
      const city = searchParams.get("city") || "自定义位置";

      if (!latStr || !lonStr) {
        return NextResponse.json(
          { error: "Missing latitude or longitude" },
          { status: 400 }
        );
      }

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const weather = await fetchWeather(lat, lon);

      return NextResponse.json({
        city,
        latitude: lat,
        longitude: lon,
        source: "custom",
        ...weather,
      });
    }

    // Action: 默认按 IP 定位获取天气
    const forwarded = request.headers.get("x-forwarded-for");
    const rawIp = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "";
    const loc = await fetchLocationByIp(rawIp);
    const weather = await fetchWeather(loc.latitude, loc.longitude);

    return NextResponse.json({
      city: loc.city,
      region: loc.region,
      country: loc.country,
      latitude: loc.latitude,
      longitude: loc.longitude,
      source: "ip",
      ...weather,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Weather API error:", error);
    // 兜底返回，避免前端报错打断
    return NextResponse.json({
      city: "北京",
      latitude: 39.9042,
      longitude: 116.4074,
      temp: 24,
      tempMax: 27,
      tempMin: 18,
      weatherCode: 0,
      weatherText: "晴",
      weatherIcon: "sun",
      isDay: true,
      source: "fallback",
      error: errorMsg,
    });
  }
}
