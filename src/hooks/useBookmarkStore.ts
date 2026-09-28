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

  const localVersionRef = useRef<number>(0);
  const isInitialSyncDoneRef = useRef<boolean>(false);
  const isPullingRef = useRef<boolean>(false);
  const isPushingRef = useRef<boolean>(false);
  const syncDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingPushDataRef = useRef<{
    folders: Folder[];
    bookmarks: Bookmark[];
    settings: Settings;
  } | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

  // Save changes to localStorage
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
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      } catch (e) {
        console.error("Failed to save settings", e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [settings, isLoaded]);

  // Set up BroadcastChannel for instant same-device cross-tab synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("vxnav_cross_tab_sync");
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "SYNC_STATE_BROADCAST") return;

      const { folders: newFolders, bookmarks: newBookmarks, settings: newSettings, version, updatedAt } =
        msg.payload || {};
      if (typeof version === "number" && version >= localVersionRef.current) {
        localVersionRef.current = version;
        isPullingRef.current = true;
        if (Array.isArray(newFolders)) setFolders(newFolders);
        if (Array.isArray(newBookmarks)) setBookmarks(newBookmarks);
        if (newSettings) setSettings(newSettings);
        setLastSyncedAt(updatedAt || Date.now());
        setSyncStatus("synced");

        try {
          if (Array.isArray(newFolders)) localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(newFolders));
          if (Array.isArray(newBookmarks)) localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(newBookmarks));
          if (newSettings) localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
        } catch {}

        setTimeout(() => {
          isPullingRef.current = false;
        }, 150);
      }
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, []);

  // 1. Core push function
  const executePush = useCallback(
    async (pushData: { folders: Folder[]; bookmarks: Bookmark[]; settings: Settings }) => {
      if (!user) return;
      isPushingRef.current = true;
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folders: pushData.folders,
            bookmarks: pushData.bookmarks,
            settings: pushData.settings,
            clientVersion: localVersionRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          localVersionRef.current = data.version;
          setSyncStatus("synced");
          setLastSyncedAt(data.updated_at);

          // Broadcast to other tabs on the same machine
          broadcastChannelRef.current?.postMessage({
            type: "SYNC_STATE_BROADCAST",
            payload: {
              folders: pushData.folders,
              bookmarks: pushData.bookmarks,
              settings: pushData.settings,
              version: data.version,
              updatedAt: data.updated_at,
            },
          });
        } else {
          setSyncStatus("offline");
        }
      } catch {
        setSyncStatus("offline");
      } finally {
        isPushingRef.current = false;
      }
    },
    [user]
  );

  // 2. Full Pull latest cloud data
  const pullFromCloud = useCallback(async () => {
    if (!user || isPullingRef.current || isPushingRef.current) return;
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const cloudData = await res.json();
        if (typeof cloudData.version === "number" && cloudData.version > localVersionRef.current) {
          isPullingRef.current = true;
          setSyncStatus("syncing");

          if (Array.isArray(cloudData.folders)) {
            setFolders(cloudData.folders);
            try {
              localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(cloudData.folders));
            } catch {}
          }

          if (Array.isArray(cloudData.bookmarks)) {
            setBookmarks(cloudData.bookmarks);
            try {
              localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(cloudData.bookmarks));
            } catch {}
          }

          if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            setSettings((prev) => {
              const merged = { ...prev, ...cloudData.settings };
              try {
                localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }

          localVersionRef.current = cloudData.version;
          setLastSyncedAt(cloudData.updated_at);
          setSyncStatus("synced");

          setTimeout(() => {
            isPullingRef.current = false;
          }, 200);
        }
      }
    } catch {
      // Ignore background pull errors
    }
  }, [user]);

  // 3. Lightweight heartbeat version check
  const checkCloudVersionAndSync = useCallback(async () => {
    if (!user || !isInitialSyncDoneRef.current || isPullingRef.current || isPushingRef.current) return;
    try {
      const res = await fetch("/api/sync?version_only=1");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.version === "number" && data.version > localVersionRef.current) {
          await pullFromCloud();
        }
      }
    } catch {
      // Ignore background heartbeat error
    }
  }, [user, pullFromCloud]);

  // 4. Initial check login status and cloud sync
  useEffect(() => {
    let cancelled = false;

    async function initAuthAndSync() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          if (!cancelled) {
            setUser(null);
            setSyncStatus("unauthenticated");
            isInitialSyncDoneRef.current = true;
          }
          return;
        }

        const meData = await meRes.json();
        if (cancelled) return;

        if (meData.user) {
          setUser(meData.user);
          setSyncStatus("syncing");

          // Pull cloud data
          const syncRes = await fetch("/api/sync");
          if (cancelled) return;

          if (syncRes.ok) {
            const cloudData = await syncRes.json();
            if (cloudData && typeof cloudData.version === "number" && cloudData.version > 0) {
              isPullingRef.current = true;
              if (Array.isArray(cloudData.folders)) {
                setFolders(cloudData.folders);
                try {
                  localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(cloudData.folders));
                } catch {}
              }
              if (Array.isArray(cloudData.bookmarks)) {
                setBookmarks(cloudData.bookmarks);
                try {
                  localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(cloudData.bookmarks));
                } catch {}
              }
              if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
                setSettings((prev) => {
                  const merged = { ...prev, ...cloudData.settings };
                  try {
                    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
                  } catch {}
                  return merged;
                });
              }
              localVersionRef.current = cloudData.version;
              setLastSyncedAt(cloudData.updated_at || Date.now());
              setSyncStatus("synced");
              setTimeout(() => {
                isPullingRef.current = false;
              }, 200);
            } else {
              // Brand new user: push existing local cache to initialize cloud database
              setSyncStatus("synced");
              let localF = folders;
              let localB = bookmarks;
              let localS = settings;
              try {
                const sf = localStorage.getItem(STORAGE_KEY_FOLDERS);
                if (sf) localF = JSON.parse(sf);
                const sb = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
                if (sb) localB = JSON.parse(sb);
                const ss = localStorage.getItem(STORAGE_KEY_SETTINGS);
                if (ss) localS = JSON.parse(ss);
              } catch {}
              executePush({ folders: localF, bookmarks: localB, settings: localS });
            }
          } else {
            setSyncStatus("offline");
          }
          isInitialSyncDoneRef.current = true;
        } else {
          setUser(null);
          setSyncStatus("unauthenticated");
          isInitialSyncDoneRef.current = true;
        }
      } catch {
        if (!cancelled) {
          setSyncStatus("unauthenticated");
          isInitialSyncDoneRef.current = true;
        }
      }
    }

    initAuthAndSync();

    return () => {
      cancelled = true;
    };
  }, []);

  // 5. Auto-sync on local user changes (250ms debounced)
  useEffect(() => {
    if (!isLoaded || !user || !isInitialSyncDoneRef.current || isPullingRef.current) return;

    pendingPushDataRef.current = { folders, bookmarks, settings };

    if (syncDebounceTimer.current) {
      clearTimeout(syncDebounceTimer.current);
    }

    syncDebounceTimer.current = setTimeout(() => {
      if (pendingPushDataRef.current) {
        const dataToPush = pendingPushDataRef.current;
        pendingPushDataRef.current = null;
        executePush(dataToPush);
      }
    }, 250);

    return () => {
      if (syncDebounceTimer.current) {
        clearTimeout(syncDebounceTimer.current);
      }
    };
  }, [folders, bookmarks, settings, isLoaded, user, executePush]);

  // 6. Guarantee uncommitted changes are pushed before page closes or tab is hidden
  useEffect(() => {
    const flushPendingSync = () => {
      if (pendingPushDataRef.current && user && isInitialSyncDoneRef.current) {
        const dataToPush = pendingPushDataRef.current;
        pendingPushDataRef.current = null;
        try {
          fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folders: dataToPush.folders,
              bookmarks: dataToPush.bookmarks,
              settings: dataToPush.settings,
              clientVersion: localVersionRef.current,
            }),
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener("beforeunload", flushPendingSync);
    window.addEventListener("pagehide", flushPendingSync);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flushPendingSync);
      window.removeEventListener("pagehide", flushPendingSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  // 7. Background heartbeat & active window detection for multi-device sync
  useEffect(() => {
    if (!user) return;

    const handleActive = () => {
      if (document.visibilityState === "visible") {
        checkCloudVersionAndSync();
      }
    };

    window.addEventListener("focus", handleActive);
    document.addEventListener("visibilitychange", handleActive);

    // 4s lightweight heartbeat
    const interval = setInterval(checkCloudVersionAndSync, 4000);

    return () => {
      window.removeEventListener("focus", handleActive);
      document.removeEventListener("visibilitychange", handleActive);
      clearInterval(interval);
    };
  }, [user, checkCloudVersionAndSync]);

  // 8. Manual sync handler
  const syncNow = useCallback(async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setSyncStatus("syncing");
    if (pendingPushDataRef.current) {
      const dataToPush = pendingPushDataRef.current;
      pendingPushDataRef.current = null;
      await executePush(dataToPush);
    } else {
      await executePush({ folders, bookmarks, settings });
    }
    await pullFromCloud();
  }, [user, folders, bookmarks, settings, executePush, pullFromCloud]);

  // 9. Auth handlers
  const handleLoginSuccess = useCallback(
    async (loggedInUser: AuthUser) => {
      setUser(loggedInUser);
      setSyncStatus("syncing");
      isInitialSyncDoneRef.current = false;
      isPullingRef.current = true;

      try {
        const res = await fetch("/api/sync");
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData && typeof cloudData.version === "number" && cloudData.version > 0) {
            if (Array.isArray(cloudData.folders)) {
              setFolders(cloudData.folders);
              try {
                localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(cloudData.folders));
              } catch {}
            }
            if (Array.isArray(cloudData.bookmarks)) {
              setBookmarks(cloudData.bookmarks);
              try {
                localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(cloudData.bookmarks));
              } catch {}
            }
            if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
              setSettings((prev) => {
                const merged = { ...prev, ...cloudData.settings };
                try {
                  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
            localVersionRef.current = cloudData.version;
            setLastSyncedAt(cloudData.updated_at || Date.now());
            setSyncStatus("synced");
          } else {
            // Brand new account on cloud: initialize with local data
            setSyncStatus("synced");
            executePush({ folders, bookmarks, settings });
          }
        }
      } catch {
        setSyncStatus("offline");
      } finally {
        isInitialSyncDoneRef.current = true;
        setTimeout(() => {
          isPullingRef.current = false;
        }, 200);
      }
    },
    [folders, bookmarks, settings, executePush]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setSyncStatus("unauthenticated");
    localVersionRef.current = 0;
    isInitialSyncDoneRef.current = false;
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

  const reorderBookmarks = useCallback((sourceId: string, targetId: string) => {
    setBookmarks((prev) => {
      const sourceIndex = prev.findIndex((b) => b.id === sourceId);
      const targetIndex = prev.findIndex((b) => b.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return prev;

      const sourceBookmark = prev[sourceIndex];
      const targetBookmark = prev[targetIndex];

      const updatedSource =
        sourceBookmark.folderId !== targetBookmark.folderId
          ? { ...sourceBookmark, folderId: targetBookmark.folderId, updatedAt: Date.now() }
          : sourceBookmark;

      const newBookmarks = [...prev];
      newBookmarks.splice(sourceIndex, 1);
      newBookmarks.splice(targetIndex, 0, updatedSource);
      return newBookmarks;
    });
  }, []);

  const moveBookmarkToFolder = useCallback((bookmarkId: string, targetFolderId: string) => {
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bookmarkId ? { ...b, folderId: targetFolderId, updatedAt: Date.now() } : b
      )
    );
  }, []);

  const batchDeleteBookmarks = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setBookmarks((prev) => prev.filter((b) => !idSet.has(b.id)));
  }, []);

  const batchMoveBookmarks = useCallback((ids: string[], targetFolderId: string) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setBookmarks((prev) =>
      prev.map((b) =>
        idSet.has(b.id) ? { ...b, folderId: targetFolderId, updatedAt: Date.now() } : b
      )
    );
  }, []);

  const batchTogglePinBookmarks = useCallback((ids: string[], pinned: boolean) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setBookmarks((prev) =>
      prev.map((b) => (idSet.has(b.id) ? { ...b, pinned, updatedAt: Date.now() } : b))
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
    a.download = `vxnav-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
    reorderBookmarks,
    moveBookmarkToFolder,
    batchDeleteBookmarks,
    batchMoveBookmarks,
    batchTogglePinBookmarks,
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
