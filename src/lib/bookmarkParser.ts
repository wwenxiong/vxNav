import { stripEmojis } from "@/lib/utils";
import { Bookmark, Folder } from "@/types";

export interface ParsedBookmarkItem {
  title: string;
  url: string;
  icon?: string;
  description?: string;
  folderName: string;
  createdAt: number;
}

export interface ParsedBookmarkResult {
  folders: string[];
  bookmarks: ParsedBookmarkItem[];
}

/**
 * Decode HTML entities like &amp;, &quot;, &#39;, &lt;, &gt;, etc.
 */
function decodeHtmlEntities(text: string): string {
  if (typeof document !== "undefined") {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Universal Browser Bookmark HTML Parser (Netscape Bookmark File Format)
 * Fully supports Chrome, Microsoft Edge, Safari, Firefox, Arc, Brave, Opera, 360, QQ, Sogou, etc.
 */
export function parseBrowserBookmarkHtml(htmlContent: string): ParsedBookmarkResult {
  const bookmarks: ParsedBookmarkItem[] = [];
  const folderStack: string[] = [];
  let pendingFolderName = "";

  // Common root-level container names across browsers that shouldn't override specific subfolders
  const genericRootNames = new Set([
    "书签栏",
    "收藏夹栏",
    "bookmarks bar",
    "bookmarks menu",
    "bookmarks toolbar",
    "favorites bar",
    "favorites",
    "bookmarks",
    "书签菜单",
    "其他书签",
    "other bookmarks",
    "移动书签",
    "mobile bookmarks",
    "我的收藏",
    "个人收藏夹",
  ]);

  // Regex matching Netscape bookmark tokens:
  // 1. <H3 ...>FolderName</H3>
  // 2. <DL> (open folder)
  // 3. </DL> (close folder)
  // 4. <A ...>BookmarkTitle</A>
  // 5. <DD>Description
  const tokenRegex =
    /<H3[^>]*>([\s\S]*?)<\/H3>|<DL[^>]*>|<\/DL>|<A\s+([^>]+)>([\s\S]*?)<\/A>|<DD>([\s\S]*?)(?=(?:<DT|<DL|<\/DL|<A|$))/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(htmlContent)) !== null) {
    const [fullMatch, h3Text, aAttrs, aText, ddText] = match;

    if (h3Text !== undefined) {
      // Detected folder header
      const rawName = decodeHtmlEntities(h3Text.replace(/<[^>]+>/g, "").trim());
      pendingFolderName = stripEmojis(rawName);
    } else if (fullMatch.toUpperCase().startsWith("<DL")) {
      // Enter folder
      const folderName =
        pendingFolderName ||
        (folderStack.length === 0 ? "常用书签" : folderStack[folderStack.length - 1]);
      folderStack.push(folderName);
      pendingFolderName = "";
    } else if (fullMatch.toUpperCase().startsWith("</DL")) {
      // Exit folder
      if (folderStack.length > 0) {
        folderStack.pop();
      }
    } else if (aAttrs !== undefined) {
      // Detected bookmark link
      const hrefMatch =
        aAttrs.match(/HREF="([^"]*)"/i) || aAttrs.match(/HREF='([^']*)'/i);
      const url = hrefMatch ? decodeHtmlEntities(hrefMatch[1].trim()) : "";

      // Ignore non-http links like bookmarklets or internal browser pages
      if (
        !url ||
        url.startsWith("javascript:") ||
        url.startsWith("place:") ||
        url.startsWith("chrome:") ||
        url.startsWith("edge:")
      ) {
        continue;
      }

      // Extract icon (often base64 or favicon url)
      const iconMatch =
        aAttrs.match(/ICON="([^"]*)"/i) ||
        aAttrs.match(/ICON='([^']*)'/i) ||
        aAttrs.match(/ICON_URI="([^"]*)"/i);
      const icon = iconMatch ? iconMatch[1].trim() : undefined;

      // Extract add date (unix timestamp in seconds)
      const dateMatch =
        aAttrs.match(/ADD_DATE="([^"]*)"/i) || aAttrs.match(/ADD_DATE='([^']*)'/i);
      const addDate = dateMatch ? parseInt(dateMatch[1], 10) * 1000 : Date.now();

      // Clean title
      const rawTitle = decodeHtmlEntities(aText.replace(/<[^>]+>/g, "").trim());
      const title = stripEmojis(rawTitle) || new URL(url).hostname || "未命名书签";

      // Determine best folder name for this bookmark
      let effectiveFolder = "常用推荐";
      if (folderStack.length > 0) {
        // Find the most specific subfolder that isn't just a generic root container
        const meaningfulFolders = folderStack.filter(
          (f) => !genericRootNames.has(f.toLowerCase().trim())
        );

        if (meaningfulFolders.length > 0) {
          effectiveFolder = meaningfulFolders[meaningfulFolders.length - 1];
        } else {
          // If the bookmark is directly inside "书签栏" or "收藏夹栏", keep that folder name
          effectiveFolder = folderStack[folderStack.length - 1] || "常用推荐";
        }
      }

      bookmarks.push({
        title,
        url,
        icon,
        folderName: effectiveFolder,
        createdAt: isNaN(addDate) || addDate === 0 ? Date.now() : addDate,
      });
    } else if (ddText !== undefined && bookmarks.length > 0) {
      // Optional description attached to previous bookmark
      const lastBm = bookmarks[bookmarks.length - 1];
      if (!lastBm.description) {
        const rawDesc = decodeHtmlEntities(ddText.replace(/<[^>]+>/g, "").trim());
        if (rawDesc) {
          lastBm.description = stripEmojis(rawDesc);
        }
      }
    }
  }

  // Collect unique folder names preserving discovery order
  const uniqueFolderNames: string[] = [];
  for (const b of bookmarks) {
    if (!uniqueFolderNames.includes(b.folderName)) {
      uniqueFolderNames.push(b.folderName);
    }
  }

  return {
    folders: uniqueFolderNames,
    bookmarks,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generate standard Netscape Bookmark HTML format.
 * Fully compatible with Chrome, Edge, Firefox, Safari, and other modern browsers.
 */
export function generateBrowserBookmarkHtml(folders: Folder[], bookmarks: Bookmark[]): string {
  const lines: string[] = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- This is an automatically generated file.",
    "     It will be read and overwritten.",
    "     DO NOT EDIT! -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  ];

  const folderMap = new Map<string, Folder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const bookmarksByFolder = new Map<string, Bookmark[]>();
  const uncategorizedBookmarks: Bookmark[] = [];

  for (const bm of bookmarks) {
    if (bm.folderId && folderMap.has(bm.folderId)) {
      const list = bookmarksByFolder.get(bm.folderId) || [];
      list.push(bm);
      bookmarksByFolder.set(bm.folderId, list);
    } else {
      uncategorizedBookmarks.push(bm);
    }
  }

  const sortedFolders = [...folders].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const folder of sortedFolders) {
    const bms = bookmarksByFolder.get(folder.id) || [];
    if (bms.length === 0) continue;

    const folderTime = Math.floor(Date.now() / 1000);
    const escapedFolderName = escapeHtml(stripEmojis(folder.name));

    lines.push(`    <DT><H3 ADD_DATE="${folderTime}" LAST_MODIFIED="${folderTime}">${escapedFolderName}</H3>`);
    lines.push("    <DL><p>");

    for (const bm of bms) {
      const addDate = Math.floor((bm.createdAt || Date.now()) / 1000);
      const escapedUrl = escapeHtml(bm.url);
      const escapedTitle = escapeHtml(stripEmojis(bm.title) || bm.url);
      const iconAttr = bm.icon ? ` ICON="${escapeHtml(bm.icon)}"` : "";

      lines.push(`        <DT><A HREF="${escapedUrl}" ADD_DATE="${addDate}"${iconAttr}>${escapedTitle}</A>`);
      if (bm.description) {
        lines.push(`        <DD>${escapeHtml(stripEmojis(bm.description))}`);
      }
    }

    lines.push("    </DL><p>");
  }

  if (uncategorizedBookmarks.length > 0) {
    const folderTime = Math.floor(Date.now() / 1000);
    lines.push(`    <DT><H3 ADD_DATE="${folderTime}" LAST_MODIFIED="${folderTime}">未分类</H3>`);
    lines.push("    <DL><p>");

    for (const bm of uncategorizedBookmarks) {
      const addDate = Math.floor((bm.createdAt || Date.now()) / 1000);
      const escapedUrl = escapeHtml(bm.url);
      const escapedTitle = escapeHtml(stripEmojis(bm.title) || bm.url);
      const iconAttr = bm.icon ? ` ICON="${escapeHtml(bm.icon)}"` : "";

      lines.push(`        <DT><A HREF="${escapedUrl}" ADD_DATE="${addDate}"${iconAttr}>${escapedTitle}</A>`);
      if (bm.description) {
        lines.push(`        <DD>${escapeHtml(stripEmojis(bm.description))}`);
      }
    }

    lines.push("    </DL><p>");
  }

  lines.push("</DL><p>");
  return lines.join("\n");
}

