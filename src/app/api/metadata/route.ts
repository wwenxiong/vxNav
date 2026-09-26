import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { stripEmojis } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Normalize protocol
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const domain = parsedUrl.hostname;
  const googleFaviconFallback = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const duckduckgoFallback = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      next: { revalidate: 3600 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Graceful fallback with domain and Google icon
      return NextResponse.json({
        title: domain,
        description: "",
        icon: googleFaviconFallback,
        url: parsedUrl.href,
        domain,
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Title
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      $('meta[name="twitter:title"]').attr("content") ||
      domain;

    // Clean up title whitespace and strip emojis
    title = stripEmojis(title.replace(/\s+/g, " "));

    // Extract Description
    let description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "";
    description = stripEmojis(description.replace(/\s+/g, " "));
    if (description.length > 150) {
      description = description.substring(0, 150) + "...";
    }

    // Extract Favicon
    let iconUrl = "";

    // 1. Apple Touch Icon (usually highest resolution)
    const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href");
    // 2. SVG Icon
    const svgIcon = $('link[rel="icon"][type*="svg"]').attr("href");
    // 3. Any standard icon
    const standardIcon =
      $('link[rel="icon"][sizes="192x192"]').attr("href") ||
      $('link[rel="icon"][sizes="128x128"]').attr("href") ||
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href");

    const foundIcon = appleTouchIcon || svgIcon || standardIcon;

    if (foundIcon) {
      try {
        iconUrl = new URL(foundIcon, parsedUrl.href).href;
      } catch {
        iconUrl = googleFaviconFallback;
      }
    } else {
      // Default to Google Favicon service or domain /favicon.ico
      iconUrl = googleFaviconFallback;
    }

    return NextResponse.json({
      title,
      description,
      icon: iconUrl,
      url: parsedUrl.href,
      domain,
      fallbackIcon: duckduckgoFallback,
    });
  } catch (err: unknown) {
    console.warn("Failed to fetch metadata for", targetUrl, err);
    // Return domain fallback on network failure / timeout
    return NextResponse.json({
      title: domain,
      description: "",
      icon: googleFaviconFallback,
      url: parsedUrl.href,
      domain,
      fallbackIcon: duckduckgoFallback,
    });
  }
}
