"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bookmark, Folder, Settings, SearchEngine } from "@/types";
import { DEFAULT_BOOKMARKS, DEFAULT_FOLDERS, DEFAULT_SETTINGS } from "@/lib/constants";
import { stripEmojis } from "@/lib/utils";
import { parseBrowserBookmarkHtml, generateBrowserBookmarkHtml } from "@/lib/bookmarkParser";

const STORAGE_KEY_FOLDERS = "nav_obsidian_folders_v1";
const STORAGE_KEY_BOOKMARKS = "nav_obsidian_bookmarks_v1";
const STORAGE_KEY_SETTINGS = "nav_obsidian_settings_v1";
const STORAGE_KEY_CLEANED_BUILTINS = "nav_obsidian_cleaned_builtins_v2";

const BUILTIN_FOLDER_IDS = new Set(["fav", "ai", "dev", "design", "tools"]);
const BUILTIN_BOOKMARK_IDS = new Set([
  "bm-github",
  "bm-v2ex",
  "bm-bilibili",
  "bm-chatgpt",
  "bm-claude",
  "bm-deepseek",
  "bm-nextjs",
  "bm-tailwind",
  "bm-obsidianui",
  "bm-figma",
  "bm-dribbble",
  "bm-notion",
]);

export interface AuthUser {
  id: string;
  username: string;
}

export type SyncStatus = "synced" | "syncing" | "offline" | "unauthenticated";

export function useBookmarkStore() {
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(DEFAULT_BOOKMARKS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [enrichStatus, setEnrichStatus] = useState<{
    running: boolean;
    current: number;
    total: number;
  }>({
    running: false,
    current: 0,
    total: 0,
  });

  // User & Cross-device Sync state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("unauthenticated");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const localVersionRef = useRef<number>(1);
  const isPullingRef = useRef<boolean>(false);
  const syncDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load from local storage
  useEffect(() => {
    try {
      let loadedFolders: Folder[] = [];
      const storedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);
      if (storedFolders) {
        const parsed: Folder[] = JSON.parse(storedFolders);
        loadedFolders = parsed.map((f) => ({ ...f, name: stripEmojis(f.name) }));
      }

      let loadedBookmarks: Bookmark[] = [];
      const storedBookmarks = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      if (storedBookmarks) {
        const parsed: Bookmark[] = JSON.parse(storedBookmarks);
        loadedBookmarks = parsed.map((b) => ({
          ...b,
          title: stripEmojis(b.title),
          description: stripEmojis(b.description || ""),
        }));
      }

      // Check if built-ins have been purged
      const alreadyCleaned = localStorage.getItem(STORAGE_KEY_CLEANED_BUILTINS);
      if (!alreadyCleaned) {
        // Automatically delete system built-in bookmarks and categories
        loadedBookmarks = loadedBookmarks.filter((b) => !BUILTIN_BOOKMARK_IDS.has(b.id));
        loadedFolders = loadedFolders.filter((f) => !BUILTIN_FOLDER_IDS.has(f.id));

        // If user has custom bookmarks whose folder was one of the purged built-in folders:
        const remainingFolderIds = new Set(loadedFolders.map((f) => f.id));
        const orphanBookmarks = loadedBookmarks.filter((b) => !remainingFolderIds.has(b.folderId));
        if (orphanBookmarks.length > 0) {
          if (loadedFolders.length === 0) {
            const defaultFolder: Folder = {
              id: "folder-" + Date.now(),
              name: "我的收藏",
              order: 1,
            };
            loadedFolders.push(defaultFolder);
            remainingFolderIds.add(defaultFolder.id);
          }
          const fallbackId = loadedFolders[0].id;
          loadedBookmarks = loadedBookmarks.map((b) =>
            remainingFolderIds.has(b.folderId) ? b : { ...b, folderId: fallbackId }
          );
        }

        localStorage.setItem(STORAGE_KEY_CLEANED_BUILTINS, "true");
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(loadedFolders));
        localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(loadedBookmarks));
      }

      setFolders(loadedFolders);
      setBookmarks(loadedBookmarks);

      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.bgOpacity === 0.65 || parsed.bgOpacity === 0.40) {
          parsed.bgOpacity = 0;
        }
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load bookmarks from storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error("Failed to save folders", e);
    }
  }, [folders, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.error("Failed to save bookmarks", e);
    }
  }, [bookmarks, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [settings, isLoaded]);

  // 1. Check user login status on mount & pull initial cloud data
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setSyncStatus("syncing");
          fetch("/api/sync")
            .then((res) => (res.ok ? res.json() : null))
            .then((cloudData) => {
              if (cloudData) {
                if (Array.isArray(cloudData.folders) && cloudData.folders.length > 0) {
                  setFolders(cloudData.folders);
                }
                if (Array.isArray(cloudData.bookmarks) && cloudData.bookmarks.length > 0) {
                  setBookmarks(cloudData.bookmarks);
                }
                if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
                  setSettings((prev) => ({ ...prev, ...cloudData.settings }));
                }
                if (cloudData.version) {
                  localVersionRef.current = cloudData.version;
                }
                setSyncStatus("synced");
                setLastSyncedAt(cloudData.updated_at || Date.now());
              } else {
                setSyncStatus("synced");
              }
            })
            .catch(() => setSyncStatus("offline"));
        } else {
          setSyncStatus("unauthenticated");
        }
      })
      .catch(() => setSyncStatus("unauthenticated"));
  }, []);

  // 2. Push changes to cloud (debounced 800ms)
  const pushToCloud = useCallback(
    async (currentFolders: Folder[], currentBookmarks: Bookmark[], currentSettings: Settings) => {
      if (!user || isPullingRef.current) return;
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folders: currentFolders,
            bookmarks: currentBookmarks,
            settings: currentSettings,
            clientVersion: localVersionRef.current,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          localVersionRef.current = data.version;
          setSyncStatus("synced");
          setLastSyncedAt(data.updated_at);
        } else {
          setSyncStatus("offline");
        }
      } catch {
        setSyncStatus("offline");
      }
    },
    [user]
  );

  // Trigger pushToCloud when data changes and user is logged in
  useEffect(() => {
    if (!isLoaded || !user || isPullingRef.current) return;
    if (syncDebounceTimer.current) {
      clearTimeout(syncDebounceTimer.current);
    }
    syncDebounceTimer.current = setTimeout(() => {
      pushToCloud(folders, bookmarks, settings);
    }, 800);

    return () => {
      if (syncDebounceTimer.current) {
        clearTimeout(syncDebounceTimer.current);
      }
    };
  }, [folders, bookmarks, settings, isLoaded, user, pushToCloud]);

  // 3. Pull latest cloud data
  const pullFromCloud = useCallback(async () => {
    if (!user || isPullingRef.current) return;
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData.version && cloudData.version > localVersionRef.current) {
          isPullingRef.current = true;
          setSyncStatus("syncing");
          if (Array.isArray(cloudData.folders)) {
            setFolders(cloudData.folders);
          }
          if (Array.isArray(cloudData.bookmarks)) {
            setBookmarks(cloudData.bookmarks);
          }
          if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...cloudData.settings }));
          }
          localVersionRef.current = cloudData.version;
          setLastSyncedAt(cloudData.updated_at);
          setSyncStatus("synced");
          setTimeout(() => {
            isPullingRef.current = false;
          }, 300);
        }
      }
    } catch {
      // Ignore background pull errors
    }
  }, [user]);

  // Pull on focus, visibility change, and periodic heartbeat
  useEffect(() => {
    if (!user) return;
    const handleActive = () => pullFromCloud();
    window.addEventListener("focus", handleActive);
    document.addEventListener("visibilitychange", handleActive);
    const timer = setInterval(pullFromCloud, 25000);

    return () => {
      window.removeEventListener("focus", handleActive);
      document.removeEventListener("visibilitychange", handleActive);
      clearInterval(timer);
    };
  }, [user, pullFromCloud]);

  // 4. Manual sync
  const syncNow = useCallback(async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setSyncStatus("syncing");
    await pushToCloud(folders, bookmarks, settings);
    await pullFromCloud();
  }, [user, folders, bookmarks, settings, pushToCloud, pullFromCloud]);

  // 5. Auth handlers
  const handleLoginSuccess = useCallback((loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    setSyncStatus("syncing");
    fetch("/api/sync")
      .then((res) => (res.ok ? res.json() : null))
      .then((cloudData) => {
        if (cloudData) {
          if (Array.isArray(cloudData.folders) && cloudData.folders.length > 0) {
            setFolders(cloudData.folders);
          }
          if (Array.isArray(cloudData.bookmarks) && cloudData.bookmarks.length > 0) {
            setBookmarks(cloudData.bookmarks);
          }
          if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            setSettings((prev) => ({ ...prev, ...cloudData.settings }));
          }
          if (cloudData.version) {
            localVersionRef.current = cloudData.version;
          }
        }
        setSyncStatus("synced");
        setLastSyncedAt(cloudData?.updated_at || Date.now());
      })
      .catch(() => setSyncStatus("synced"));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setUser(null);
    setSyncStatus("unauthenticated");
  }, []);

  // Bookmark actions
  const addBookmark = useCallback(
    (newBm: Omit<Bookmark, "id" | "createdAt">) => {
      let targetFolderId = newBm.folderId;
      if (!targetFolderId || !folders.some((f) => f.id === targetFolderId)) {
        if (folders.length > 0) {
          targetFolderId = folders[0].id;
        } else {
          const defaultFolder: Folder = {
            id: "folder-" + Date.now(),
            name: "我的收藏",
            order: 1,
          };
          setFolders([defaultFolder]);
          targetFolderId = defaultFolder.id;
        }
      }

      const bookmark: Bookmark = {
        ...newBm,
        folderId: targetFolderId,
        title: stripEmojis(newBm.title),
        description: stripEmojis(newBm.description || ""),
        id: "bm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        createdAt: Date.now(),
        clickCount: 0,
      };
      setBookmarks((prev) => [bookmark, ...prev]);
      return bookmark;
    },
    [folders]
  );

  const updateBookmark = useCallback((id: string, updates: Partial<Bookmark>) => {
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              ...updates,
              title: updates.title ? stripEmojis(updates.title) : b.title,
              description:
                updates.description !== undefined
                  ? stripEmojis(updates.description)
                  : b.description,
              updatedAt: Date.now(),
            }
          : b
      )
    );
  }, []);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, pinned: !b.pinned } : b))
    );
  }, []);

  const recordVisit = useCallback((id: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, clickCount: (b.clickCount || 0) + 1 } : b))
    );
  }, []);

  // Folder actions
  const addFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: "folder-" + Date.now(),
      name: stripEmojis(name),
      order: folders.length + 1,
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  }, [folders.length]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, ...updates, name: updates.name ? stripEmojis(updates.name) : f.name }
          : f
      )
    );
  }, []);

  const deleteFolder = useCallback((id: string) => {
    // Delete folder and move its bookmarks to first available folder or fallback
    setFolders((prev) => {
      const remaining = prev.filter((f) => f.id !== id);
      const fallbackFolderId = remaining[0]?.id || "";
      setBookmarks((bms) =>
        bms.map((b) => (b.folderId === id ? { ...b, folderId: fallbackFolderId } : b))
      );
      return remaining;
    });

    if (activeFolderId === id) {
      setActiveFolderId("all");
    }
  }, [activeFolderId]);

  // Settings
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // Export / Import
  const exportData = useCallback(() => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      folders,
      bookmarks,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `obsidian-nav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [folders, bookmarks, settings]);

  const exportHtml = useCallback(() => {
    const htmlContent = generateBrowserBookmarkHtml(folders, bookmarks);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [folders, bookmarks]);

  const importData = useCallback((jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data.folders) && Array.isArray(data.bookmarks)) {
        setFolders(data.folders);
        setBookmarks(data.bookmarks);
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        return { success: true };
      }
      return { success: false, error: "文件格式无效" };
    } catch {
      return { success: false, error: "JSON 解析失败" };
    }
  }, []);

  const importBrowserHtml = useCallback(
    (htmlContent: string) => {
      try {
        const parsed = parseBrowserBookmarkHtml(htmlContent);
        if (parsed.bookmarks.length === 0) {
          return {
            success: false,
            error: "未在文件中找到有效的书签链接，请确保是浏览器导出的 HTML 书签文件",
          };
        }

        // Map folder names to existing or new folder IDs
        const existingFolderMap = new Map<string, string>();
        for (const f of folders) {
          existingFolderMap.set(f.name.toLowerCase().trim(), f.id);
        }

        const newFoldersToCreate: Folder[] = [];
        const folderNameToId = new Map<string, string>();

        let nextOrder = folders.length + 1;
        for (const folderName of parsed.folders) {
          const key = folderName.toLowerCase().trim();
          if (existingFolderMap.has(key)) {
            folderNameToId.set(folderName, existingFolderMap.get(key)!);
          } else {
            const newFolderId =
              "folder-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
            const newFolder: Folder = {
              id: newFolderId,
              name: stripEmojis(folderName),
              order: nextOrder++,
            };
            newFoldersToCreate.push(newFolder);
            existingFolderMap.set(key, newFolderId);
            folderNameToId.set(folderName, newFolderId);
          }
        }

        if (newFoldersToCreate.length === 0 && folders.length === 0) {
          const defaultFolder: Folder = {
            id: "folder-" + Date.now(),
            name: "导入书签",
            order: 1,
          };
          newFoldersToCreate.push(defaultFolder);
          folderNameToId.set("导入书签", defaultFolder.id);
        }

        const fallbackFolderId = newFoldersToCreate[0]?.id || folders[0]?.id || "";

        // Existing bookmark URLs for deduplication
        const existingUrls = new Set(bookmarks.map((b) => b.url.toLowerCase().trim()));
        const newBookmarksToCreate: Bookmark[] = [];

        for (const item of parsed.bookmarks) {
          const targetFolderId =
            folderNameToId.get(item.folderName) || fallbackFolderId;

          // Avoid duplicate identical URLs if already in collection
          if (existingUrls.has(item.url.toLowerCase().trim())) {
            continue;
          }

          let iconUrl = item.icon;
          if (!iconUrl) {
            try {
              iconUrl = `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=128`;
            } catch {
              iconUrl = undefined;
            }
          }

          const newBm: Bookmark = {
            id: "bm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
            folderId: targetFolderId,
            title: stripEmojis(item.title),
            url: item.url,
            icon: iconUrl,
            description: item.description ? stripEmojis(item.description) : "",
            createdAt: item.createdAt || Date.now(),
            clickCount: 0,
          };

          newBookmarksToCreate.push(newBm);
          existingUrls.add(item.url.toLowerCase().trim());
        }

        if (newFoldersToCreate.length > 0) {
          setFolders((prev) => [...prev, ...newFoldersToCreate]);
        }

        if (newBookmarksToCreate.length > 0) {
          setBookmarks((prev) => [...prev, ...newBookmarksToCreate]);
          // Automatically fetch icons and descriptions in background
          setTimeout(() => {
            enrichBookmarksMetadata(newBookmarksToCreate);
          }, 300);
        }

        return {
          success: true,
          importedBookmarks: newBookmarksToCreate.length,
          totalFound: parsed.bookmarks.length,
          importedFolders: newFoldersToCreate.length,
          totalFolders: parsed.folders.length,
        };
      } catch (e: any) {
        return {
          success: false,
          error: "解析书签文件失败: " + (e?.message || "未知错误"),
        };
      }
    },
    [folders, bookmarks]
  );

  const enrichBookmarksMetadata = useCallback(
    async (itemsToEnrich: Bookmark[]) => {
      // Find items that need description or high-resolution icon
      const queue = itemsToEnrich.filter(
        (b) => !b.description || !b.icon || !b.icon.startsWith("data:")
      );

      if (queue.length === 0) return;

      setEnrichStatus({
        running: true,
        current: 0,
        total: queue.length,
      });

      let current = 0;
      const CONCURRENCY = 4;
      const queueCopy = [...queue];

      const worker = async () => {
        while (queueCopy.length > 0) {
          const item = queueCopy.shift();
          if (!item) break;

          try {
            const res = await fetch(`/api/metadata?url=${encodeURIComponent(item.url)}`);
            if (res.ok) {
              const data = await res.json();
              const updates: Partial<Bookmark> = {};
              if (
                data.description &&
                (!item.description || item.description === "暂无描述" || item.description === "暂无描述信息")
              ) {
                updates.description = stripEmojis(data.description);
              }
              if (data.icon && (!item.icon || !item.icon.startsWith("data:"))) {
                updates.icon = data.icon;
              }
              if (data.title && item.title === item.url) {
                updates.title = stripEmojis(data.title);
              }
              if (Object.keys(updates).length > 0) {
                updateBookmark(item.id, updates);
              }
            }
          } catch (e) {
            // Silently continue
          } finally {
            current++;
            setEnrichStatus((prev) => ({
              ...prev,
              current,
            }));
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
      );

      setEnrichStatus((prev) => ({
        ...prev,
        running: false,
      }));
    },
    [updateBookmark]
  );

  const resetToDefaults = useCallback(() => {
    setFolders([]);
    setBookmarks([]);
    setSettings(DEFAULT_SETTINGS);
    setActiveFolderId("all");
    localStorage.setItem(STORAGE_KEY_CLEANED_BUILTINS, "true");
  }, []);

  return {
    isLoaded,
    folders,
    bookmarks,
    settings,
    activeFolderId,
    setActiveFolderId,
    searchQuery,
    setSearchQuery,
    enrichStatus,
    enrichBookmarksMetadata,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    togglePin,
    recordVisit,
    addFolder,
    updateFolder,
    deleteFolder,
    updateSettings,
    exportData,
    exportHtml,
    importData,
    importBrowserHtml,
    resetToDefaults,
    user,
    syncStatus,
    lastSyncedAt,
    authModalOpen,
    setAuthModalOpen,
    handleLoginSuccess,
    logout,
    syncNow,
  };
}
