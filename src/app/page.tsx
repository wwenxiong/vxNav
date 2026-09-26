"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useBookmarkStore } from "@/hooks/useBookmarkStore";
import { Bookmark, Folder, SortOption } from "@/types";
import Header from "@/components/Header";
import FolderNav from "@/components/FolderNav";
import BookmarkCard from "@/components/BookmarkCard";
import DashboardWidget from "@/components/DashboardWidget";
import AddBookmarkModal from "@/components/AddBookmarkModal";
import FolderModal from "@/components/FolderModal";
import BackgroundModal from "@/components/BackgroundModal";
import BookmarkletModal from "@/components/BookmarkletModal";
import AuthModal from "@/components/AuthModal";
import BatchActionBar from "@/components/BatchActionBar";
import ClickSpark from "@/components/ui/click-spark";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pin, FolderSearch, BookmarkPlus, Loader2, ChevronRight } from "lucide-react";

function NavigationContent() {
  const {
    isLoaded,
    folders,
    bookmarks,
    settings,
    activeFolderId,
    setActiveFolderId,
    searchQuery,
    setSearchQuery,
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
    enrichStatus,
    resetToDefaults,
    user,
    syncStatus,
    lastSyncedAt,
    authModalOpen,
    setAuthModalOpen,
    handleLoginSuccess,
    logout,
    syncNow,
  } = useBookmarkStore();

  const searchParams = useSearchParams();

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);
  const [bookmarkletModalOpen, setBookmarkletModalOpen] = useState(false);

  // Drag and Drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverSectionFolderId, setDragOverSectionFolderId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCardId(null);
    setDragOverSectionFolderId(null);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDragEnter = (e: React.DragEvent, targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      setDragOverCardId(targetId);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedId || e.dataTransfer.getData("text/plain");
    if (sourceId && sourceId !== targetId) {
      reorderBookmarks(sourceId, targetId);
    }
    setDraggedId(null);
    setDragOverCardId(null);
    setDragOverSectionFolderId(null);
  };

  const handleDropToFolder = (targetFolderId: string) => {
    if (draggedId) {
      moveBookmarkToFolder(draggedId, targetFolderId);
    }
    setDraggedId(null);
    setDragOverCardId(null);
    setDragOverSectionFolderId(null);
  };

  // Batch Management state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchMove = (targetFolderId: string) => {
    batchMoveBookmarks(selectedIds, targetFolderId);
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    batchDeleteBookmarks(selectedIds);
    setSelectedIds([]);
  };

  const handleBatchTogglePin = (pinned: boolean) => {
    batchTogglePinBookmarks(selectedIds, pinned);
    setSelectedIds([]);
  };

  const handleExitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedIds([]);
  };

  // Quick Add from Bookmarklet / URL query
  useEffect(() => {
    if (!searchParams) return;
    const quickAdd = searchParams.get("quick_add");
    const passedUrl = searchParams.get("url");
    const passedTitle = searchParams.get("title");

    if (quickAdd && passedUrl) {
      let decodedUrl = passedUrl;
      try {
        decodedUrl = decodeURIComponent(passedUrl);
      } catch {
        decodedUrl = passedUrl;
      }

      let decodedTitle = passedTitle || "";
      try {
        if (passedTitle) decodedTitle = decodeURIComponent(passedTitle);
      } catch {
        decodedTitle = passedTitle || "";
      }

      setEditingBookmark({
        id: "",
        folderId: folders[0]?.id || "",
        title: decodedTitle,
        url: decodedUrl,
        createdAt: Date.now(),
      });
      setAddModalOpen(true);

      // Clean up the URL query parameters so it does not re-trigger on state changes
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [searchParams, folders]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAddModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Synchronize dynamic glass opacity CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--nav-opacity", String(settings.navOpacity ?? 0.6));
    root.style.setProperty("--card-opacity", String(settings.cardOpacity ?? 0.45));
    root.style.setProperty("--modal-opacity", String(settings.modalOpacity ?? 0.85));
  }, [settings.navOpacity, settings.cardOpacity, settings.modalOpacity]);

  // Sorting preference state
  const [sortBy, setSortBy] = useState<SortOption>("default");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nav_obsidian_sort_v1");
      if (
        saved &&
        (saved === "default" ||
          saved === "time-desc" ||
          saved === "time-asc" ||
          saved === "clicks-desc")
      ) {
        setSortBy(saved as SortOption);
      }
    } catch (e) {
      console.error("Failed to load sort preference", e);
    }
  }, []);

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    try {
      localStorage.setItem("nav_obsidian_sort_v1", newSort);
    } catch (e) {
      console.error("Failed to save sort preference", e);
    }
  };

  const sortBookmarks = useCallback(
    (list: Bookmark[]) => {
      if (sortBy === "default") return list;
      const sorted = [...list];
      if (sortBy === "clicks-desc") {
        sorted.sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
      } else if (sortBy === "time-desc") {
        sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      } else if (sortBy === "time-asc") {
        sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      }
      return sorted;
    },
    [sortBy]
  );

  // Compute stats
  const folderCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookmarks) {
      map[b.folderId] = (map[b.folderId] || 0) + 1;
    }
    return map;
  }, [bookmarks]);

  const pinnedBookmarks = useMemo(() => {
    return sortBookmarks(bookmarks.filter((b) => b.pinned));
  }, [bookmarks, sortBookmarks]);

  // Filter bookmarks with sorting applied
  const filteredBookmarks = useMemo(() => {
    let list = bookmarks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
      return sortBookmarks(list);
    }

    if (activeFolderId === "pinned") {
      return sortBookmarks(list.filter((b) => b.pinned));
    }

    if (activeFolderId !== "all") {
      return sortBookmarks(list.filter((b) => b.folderId === activeFolderId));
    }

    return sortBookmarks(list);
  }, [bookmarks, searchQuery, activeFolderId, sortBookmarks]);

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setAddModalOpen(true);
  };

  const handleCreateBookmark = () => {
    setEditingBookmark(null);
    setAddModalOpen(true);
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderModalOpen(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderModalOpen(true);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Dynamic Background Layer */}
      {settings.backgroundImage ? (
        <div
          className="fixed inset-0 -z-30 bg-cover bg-center transition-[filter,opacity] duration-700"
          style={{
            backgroundImage: `url(${settings.backgroundImage})`,
            filter: `blur(${settings.bgBlur}px)`,
            transform: "scale(1.08)",
          }}
        />
      ) : (
        <div className="fixed inset-0 -z-30 bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-[#0c0c12] dark:to-zinc-950" />
      )}

      {/* Overlay Mask — uses overlay-color CSS variable */}
      <div
        className="fixed inset-0 -z-20 transition-opacity duration-300"
        style={{
          backgroundColor: `rgba(var(--overlay-color), ${settings.bgOpacity})`,
        }}
      />

      {/* Ambient Radial Glow */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-500/8 dark:bg-violet-600/10 blur-[120px]" />

      {/* Click Sparkles */}
      {settings.clickSparkEnabled && <ClickSpark sparkColor="#8b5cf6" />}

      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        settings={settings}
        onUpdateSettings={updateSettings}
        onOpenAddModal={handleCreateBookmark}
        onOpenBackgroundModal={() => setBackgroundModalOpen(true)}
        onOpenBookmarkletModal={() => setBookmarkletModalOpen(true)}
        onExportData={exportData}
        onExportHtml={exportHtml}
        onImportData={importData}
        onImportBrowserHtml={importBrowserHtml}
        onResetDefaults={resetToDefaults}
        user={user}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={logout}
        onSyncNow={syncNow}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 py-4 sm:px-8 max-w-[1920px] mx-auto">
        {/* Category Navigation Bar */}
        <div className="mb-5">
          <FolderNav
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={setActiveFolderId}
            onOpenCreateFolder={handleCreateFolder}
            onOpenEditFolder={handleEditFolder}
            folderCounts={folderCounts}
            totalCount={bookmarks.length}
            pinnedCount={pinnedBookmarks.length}
            onOpenAddBookmark={handleCreateBookmark}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            onDropBookmarkToFolder={handleDropToFolder}
            isBatchMode={isBatchMode}
            onToggleBatchMode={() => {
              setIsBatchMode((prev) => !prev);
              setSelectedIds([]);
            }}
          />
        </div>

        {/* Top Greeting & Weather/Clock Widget (shown when not searching) */}
        {!searchQuery.trim() && <DashboardWidget />}

        {/* Content Section with AnimatePresence */}
        <AnimatePresence mode="wait">
          {!isLoaded ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-64 items-center justify-center"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </motion.div>
          ) : filteredBookmarks.length === 0 ? (
            /* Empty State */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex min-h-[350px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-[var(--glass-bg)] p-8 text-center backdrop-blur-xl"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20 mb-3">
                <FolderSearch className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">暂无书签</h3>
              <p className="mt-1 max-w-sm text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                {searchQuery
                  ? `未找到与 "${searchQuery}" 相关的书签`
                  : "当前分类暂无书签，可点击下方按钮添加。"}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateBookmark}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  <Plus className="h-4 w-4" />
                  <span>添加书签</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookmarkletModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-white hover:text-black dark:hover:text-zinc-200 transition-colors shadow-sm"
                >
                  <BookmarkPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>快捷收藏</span>
                </button>
              </div>
            </motion.div>
          ) : activeFolderId === "all" && !searchQuery.trim() ? (
            /* "All" View */
            <motion.div
              key="all-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-9"
            >
              {/* Pinned Section */}
              {pinnedBookmarks.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveFolderId("pinned")}
                      className="group/title flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white text-shadow-contrast tracking-tight flex items-center gap-1.5">
                        <span className="text-base select-none">⭐</span>
                        <span>常用推荐</span>
                      </h3>
                      <span className="rounded-full bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono font-medium text-shadow-contrast">
                        {pinnedBookmarks.length}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-400 group-hover/title:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {pinnedBookmarks.map((bm) => (
                      <BookmarkCard
                        key={bm.id}
                        bookmark={bm}
                        folder={folders.find((f) => f.id === bm.folderId)}
                        onVisit={recordVisit}
                        onEdit={handleEditBookmark}
                        onDelete={deleteBookmark}
                        onTogglePin={togglePin}
                        draggable={!searchQuery.trim()}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleCardDragOver}
                        onDragEnter={handleCardDragEnter}
                        onDrop={handleCardDrop}
                        isDragging={draggedId === bm.id}
                        isDragOver={dragOverCardId === bm.id}
                        isBatchMode={isBatchMode}
                        isSelected={selectedIds.includes(bm.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Folder Sections */}
              {folders.map((folder) => {
                const folderBms = sortBookmarks(bookmarks.filter((b) => b.folderId === folder.id));
                if (folderBms.length === 0) return null;

                // Pick an icon matching common category names if no emoji present
                let categoryIcon = "📁";
                if (/常用|推荐|星标/i.test(folder.name)) categoryIcon = "⭐";
                else if (/工作|学习|办公|项目|开发/i.test(folder.name)) categoryIcon = "💼";
                else if (/生活|娱乐|影视|音乐|游戏/i.test(folder.name)) categoryIcon = "💜";
                else if (/工具|效率|实用|在线/i.test(folder.name)) categoryIcon = "⚡";
                else if (/设计|灵感|素材|创意/i.test(folder.name)) categoryIcon = "🎨";
                else if (/AI|智能|助手|大模型/i.test(folder.name)) categoryIcon = "✨";
                else if (/资讯|新闻|社区|博客/i.test(folder.name)) categoryIcon = "📰";

                const hasCustomEmoji = /^[\p{Emoji}\u2600-\u27BF]/u.test(folder.name.trim());
                const isSectionDragOver =
                  dragOverSectionFolderId === folder.id &&
                  draggedId &&
                  bookmarks.find((b) => b.id === draggedId)?.folderId !== folder.id;

                return (
                  <section
                    key={folder.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverSectionFolderId !== folder.id) {
                        setDragOverSectionFolderId(folder.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverSectionFolderId === folder.id) {
                        setDragOverSectionFolderId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = draggedId || e.dataTransfer.getData("text/plain");
                      if (sourceId) {
                        moveBookmarkToFolder(sourceId, folder.id);
                      }
                      setDraggedId(null);
                      setDragOverCardId(null);
                      setDragOverSectionFolderId(null);
                    }}
                    className={`space-y-3 p-2 -m-2 rounded-3xl transition-all duration-200 ${
                      isSectionDragOver
                        ? "bg-violet-500/10 dark:bg-violet-500/15 ring-2 ring-dashed ring-violet-500/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between group/header">
                      <button
                        type="button"
                        onClick={() => setActiveFolderId(folder.id)}
                        className="group/title flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                      >
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white text-shadow-contrast tracking-tight flex items-center gap-1.5">
                          {!hasCustomEmoji && <span className="text-base select-none">{categoryIcon}</span>}
                          <span>{folder.name}</span>
                        </h3>
                        <span className="rounded-full bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono font-medium text-shadow-contrast">
                          {folderBms.length}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-400 group-hover/title:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditFolder(folder)}
                        className="opacity-0 group-hover/header:opacity-100 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium transition-all text-shadow-contrast"
                      >
                        编辑分类
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                      {folderBms.map((bm) => (
                        <BookmarkCard
                          key={bm.id}
                          bookmark={bm}
                          folder={folder}
                          onVisit={recordVisit}
                          onEdit={handleEditBookmark}
                          onDelete={deleteBookmark}
                          onTogglePin={togglePin}
                          draggable={!searchQuery.trim()}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleCardDragOver}
                          onDragEnter={handleCardDragEnter}
                          onDrop={handleCardDrop}
                          isDragging={draggedId === bm.id}
                          isDragOver={dragOverCardId === bm.id}
                          isBatchMode={isBatchMode}
                          isSelected={selectedIds.includes(bm.id)}
                          onToggleSelect={handleToggleSelect}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* Uncategorized Bookmarks */}
              {(() => {
                const knownFolderIds = new Set(folders.map((f) => f.id));
                const orphanBms = sortBookmarks(bookmarks.filter((b) => !knownFolderIds.has(b.folderId)));
                if (orphanBms.length === 0) return null;

                const isUncategorizedDragOver =
                  dragOverSectionFolderId === "uncategorized" &&
                  draggedId &&
                  Boolean(bookmarks.find((b) => b.id === draggedId)?.folderId);

                return (
                  <section
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverSectionFolderId !== "uncategorized") {
                        setDragOverSectionFolderId("uncategorized");
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverSectionFolderId === "uncategorized") {
                        setDragOverSectionFolderId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = draggedId || e.dataTransfer.getData("text/plain");
                      if (sourceId) {
                        moveBookmarkToFolder(sourceId, "");
                      }
                      setDraggedId(null);
                      setDragOverCardId(null);
                      setDragOverSectionFolderId(null);
                    }}
                    className={`space-y-3 p-2 -m-2 rounded-3xl transition-all duration-200 ${
                      isUncategorizedDragOver
                        ? "bg-violet-500/10 dark:bg-violet-500/15 ring-2 ring-dashed ring-violet-500/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white text-shadow-contrast flex items-center gap-1.5">
                          <span className="text-base select-none">📁</span>
                          <span>未分类</span>
                        </h3>
                        <span className="rounded-full bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono font-medium text-shadow-contrast">
                          {orphanBms.length}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                      {orphanBms.map((bm) => (
                        <BookmarkCard
                          key={bm.id}
                          bookmark={bm}
                          folder={undefined}
                          onVisit={recordVisit}
                          onEdit={handleEditBookmark}
                          onDelete={deleteBookmark}
                          onTogglePin={togglePin}
                          draggable={!searchQuery.trim()}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleCardDragOver}
                          onDragEnter={handleCardDragEnter}
                          onDrop={handleCardDrop}
                          isDragging={draggedId === bm.id}
                          isDragOver={dragOverCardId === bm.id}
                          isBatchMode={isBatchMode}
                          isSelected={selectedIds.includes(bm.id)}
                          onToggleSelect={handleToggleSelect}
                        />
                      ))}
                    </div>
                  </section>
                );
              })()}
            </motion.div>
          ) : (
            /* Filtered or Specific Folder */
            <motion.div
              key={`filtered-${activeFolderId}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 font-medium text-shadow-contrast">
                <span>共 {filteredBookmarks.length} 个书签</span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                  >
                    清除搜索
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredBookmarks.map((bm) => (
                  <BookmarkCard
                    key={bm.id}
                    bookmark={bm}
                    folder={folders.find((f) => f.id === bm.folderId)}
                    onVisit={recordVisit}
                    onEdit={handleEditBookmark}
                    onDelete={deleteBookmark}
                    onTogglePin={togglePin}
                    draggable={!searchQuery.trim()}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleCardDragOver}
                    onDragEnter={handleCardDragEnter}
                    onDrop={handleCardDrop}
                    isDragging={draggedId === bm.id}
                    isDragOver={dragOverCardId === bm.id}
                    isBatchMode={isBatchMode}
                    isSelected={selectedIds.includes(bm.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Batch Action Toolbar */}
      <AnimatePresence>
        {isBatchMode && (
          <BatchActionBar
            selectedIds={selectedIds}
            totalVisibleCount={filteredBookmarks.length}
            folders={folders}
            onSelectAll={() => setSelectedIds(filteredBookmarks.map((b) => b.id))}
            onClearSelection={handleClearSelection}
            onBatchMove={handleBatchMove}
            onBatchDelete={handleBatchDelete}
            onBatchTogglePin={handleBatchTogglePin}
            onExitBatchMode={handleExitBatchMode}
          />
        )}
      </AnimatePresence>

      {/* Decorative Corner Text from Reference Mockup */}
      <div className="pointer-events-none fixed bottom-4 left-6 z-20 hidden md:block text-xs font-serif italic text-white/50 dark:text-white/40 select-none tracking-wider text-shadow-contrast">
        Good Things Take Time.
      </div>
      <div className="pointer-events-none fixed bottom-4 right-6 z-20 hidden md:block text-xs font-medium text-white/50 dark:text-white/40 select-none tracking-widest text-shadow-contrast">
        保持热爱 继续前行 ☺
      </div>

      {/* Background Bookmark Metadata Enrichment Progress Toast */}
      <AnimatePresence>
        {enrichStatus.running && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-white/30 dark:border-white/10 bg-white/85 dark:bg-zinc-900/85 px-4 py-3 shadow-2xl backdrop-blur-xl"
          >
            <Loader2 className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400 shrink-0" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  正在获取网站信息
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {enrichStatus.current} / {enrichStatus.total}
                </span>
              </div>
              <div className="h-1.5 w-44 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                  style={{
                    width: `${enrichStatus.total > 0 ? (enrichStatus.current / enrichStatus.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AddBookmarkModal
        open={addModalOpen}
        onOpenChange={(isOpen) => {
          setAddModalOpen(isOpen);
          if (!isOpen) {
            setEditingBookmark(null);
          }
        }}
        folders={folders}
        currentFolderId={activeFolderId}
        initialData={editingBookmark}
        onSave={addBookmark}
        onUpdate={updateBookmark}
      />

      <FolderModal
        open={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        folderToEdit={editingFolder}
        onSave={(name) => {
          addFolder(name);
        }}
        onUpdate={updateFolder}
        onDelete={deleteFolder}
      />

      <BackgroundModal
        open={backgroundModalOpen}
        onOpenChange={setBackgroundModalOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      <BookmarkletModal
        open={bookmarkletModalOpen}
        onOpenChange={setBookmarkletModalOpen}
      />

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onLoginSuccess={handleLoginSuccess}
        localBookmarksCount={bookmarks.length}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--muted-foreground)]">
          加载中...
        </div>
      }
    >
      <NavigationContent />
    </Suspense>
  );
}
