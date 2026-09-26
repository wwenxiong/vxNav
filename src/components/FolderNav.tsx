"use client";

import React, { useRef, useEffect, useState } from "react";
import { Folder, SortOption } from "@/types";
import { Layers, Plus, FolderPlus, Edit2, Pin, ArrowUpDown, Clock, Flame, Check, Sparkles, LayoutGrid, CheckSquare } from "lucide-react";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderNavProps {
  folders: Folder[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
  onOpenCreateFolder: () => void;
  onOpenEditFolder: (folder: Folder) => void;
  folderCounts: Record<string, number>;
  totalCount: number;
  pinnedCount: number;
  onOpenAddBookmark?: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onDropBookmarkToFolder?: (folderId: string) => void;
  isBatchMode?: boolean;
  onToggleBatchMode?: () => void;
}

export function FolderNav({
  folders,
  activeFolderId,
  onSelectFolder,
  onOpenCreateFolder,
  onOpenEditFolder,
  folderCounts,
  totalCount,
  pinnedCount,
  onOpenAddBookmark,
  sortBy,
  onSortChange,
  onDropBookmarkToFolder,
  isBatchMode = false,
  onToggleBatchMode,
}: FolderNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Compute animated indicator position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeBtn = container.querySelector<HTMLElement>(`[data-folder-id="${activeFolderId}"]`);
    if (activeBtn) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setIndicatorStyle({
        left: btnRect.left - containerRect.left + container.scrollLeft,
        width: btnRect.width,
      });
    }
  }, [activeFolderId, folders]);

  const tabBase =
    "relative z-10 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-shadow-contrast select-none";
  const tabActive = "text-white font-semibold";
  const tabInactive =
    "text-zinc-700 dark:text-zinc-200 hover:text-black dark:hover:text-white font-semibold";
  const badgeActive = "bg-white/25 text-white font-bold";
  const badgeInactive = "bg-zinc-200/80 dark:bg-white/15 text-zinc-800 dark:text-zinc-200 font-bold";

  return (
    <div className="flex items-center justify-between gap-3 overflow-x-auto py-1 noScrollbar">
      {/* Category Tabs with sliding pill indicator */}
      <div
        ref={containerRef}
        className="relative flex items-center gap-1.5 flex-nowrap rounded-full p-1 bg-white/40 dark:bg-zinc-900/40 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-sm"
      >
        {/* Animated sliding indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.35)]"
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 32,
          }}
        />

        {/* All Bookmarks Tab */}
        <button
          type="button"
          data-folder-id="all"
          onClick={() => onSelectFolder("all")}
          className={`${tabBase} ${activeFolderId === "all" ? tabActive : tabInactive}`}
        >
          <Layers className="h-4 w-4" />
          <span>全部</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
              activeFolderId === "all" ? badgeActive : badgeInactive
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Pinned Tab */}
        {pinnedCount > 0 && (
          <button
            type="button"
            data-folder-id="pinned"
            onClick={() => onSelectFolder("pinned")}
            className={`${tabBase} ${activeFolderId === "pinned" ? tabActive : tabInactive}`}
          >
            <Pin className="h-3.5 w-3.5" />
            <span>置顶</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                activeFolderId === "pinned" ? badgeActive : badgeInactive
              }`}
            >
              {pinnedCount}
            </span>
          </button>
        )}

        {/* User Folders */}
        {folders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          const isDragOverThis = dragOverFolderId === folder.id;
          const count = folderCounts[folder.id] || 0;

          return (
            <div key={folder.id} className="relative group/folder flex items-center">
              <button
                type="button"
                data-folder-id={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverFolderId !== folder.id) {
                    setDragOverFolderId(folder.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverFolderId === folder.id) {
                    setDragOverFolderId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(null);
                  onDropBookmarkToFolder?.(folder.id);
                }}
                className={`${tabBase} ${isActive ? tabActive : tabInactive} ${
                  isDragOverThis
                    ? "ring-2 ring-violet-400 bg-violet-500/25 scale-105 transition-transform"
                    : ""
                }`}
              >
                <span>{folder.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                    isActive ? badgeActive : badgeInactive
                  }`}
                >
                  {count}
                </span>
              </button>

              {/* Edit Folder button on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditFolder(folder);
                }}
                className="opacity-0 group-hover/folder:opacity-100 transition-opacity ml-[-24px] mr-2 z-20 rounded-full p-1 bg-zinc-200/90 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white"
                title={`编辑分类: ${folder.name}`}
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* + 添加网址 Button (Translucent Pill) */}
        {onOpenAddBookmark && (
          <button
            type="button"
            onClick={onOpenAddBookmark}
            className="flex items-center gap-1.5 rounded-full border border-white/60 dark:border-white/10 bg-white/70 dark:bg-zinc-800/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-300 hover:border-violet-400/40 backdrop-blur-md transition-all shadow-sm active:scale-95 text-shadow-contrast cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>添加网址</span>
          </button>
        )}

        {/* Consolidated Options & View Round Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md shadow-sm transition-all active:scale-95 cursor-pointer ${
                isBatchMode
                  ? "border-violet-600 bg-violet-600 text-white shadow-[0_2px_12px_rgba(139,92,246,0.35)]"
                  : sortBy !== "default"
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                  : "border-white/60 dark:border-white/10 bg-white/70 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-400/40"
              }`}
              title="功能菜单与排序"
              aria-label="功能菜单与排序"
            >
              <LayoutGrid className="h-4 w-4" />
              {isBatchMode && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 p-1.5">
            {/* Quick Actions */}
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
              快捷操作
            </div>

            <DropdownMenuItem
              onClick={onOpenCreateFolder}
              className="flex items-center gap-2 text-xs font-medium cursor-pointer rounded-lg py-2 hover:bg-violet-50 dark:hover:bg-violet-950/40 focus:bg-violet-50 dark:focus:bg-violet-950/40"
            >
              <FolderPlus className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span>新建分类</span>
            </DropdownMenuItem>

            {onToggleBatchMode && (
              <DropdownMenuItem
                onClick={onToggleBatchMode}
                className="flex items-center justify-between text-xs font-medium cursor-pointer rounded-lg py-2 hover:bg-violet-50 dark:hover:bg-violet-950/40 focus:bg-violet-50 dark:focus:bg-violet-950/40"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{isBatchMode ? "退出批量管理" : "批量管理"}</span>
                </div>
                {isBatchMode && (
                  <span className="rounded-full bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    进行中
                  </span>
                )}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1.5" />

            {/* Sort Section */}
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
              <span>排序方式</span>
              <ArrowUpDown className="h-3 w-3" />
            </div>

            <DropdownMenuItem
              onClick={() => onSortChange("default")}
              className="flex items-center justify-between text-xs font-medium cursor-pointer rounded-lg py-1.5"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>默认排序</span>
              </div>
              {sortBy === "default" && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onSortChange("time-desc")}
              className="flex items-center justify-between text-xs font-medium cursor-pointer rounded-lg py-1.5"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                <span>按添加时间 (由近到远)</span>
              </div>
              {sortBy === "time-desc" && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onSortChange("time-asc")}
              className="flex items-center justify-between text-xs font-medium cursor-pointer rounded-lg py-1.5"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                <span>按添加时间 (由远到近)</span>
              </div>
              {sortBy === "time-asc" && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onSortChange("clicks-desc")}
              className="flex items-center justify-between text-xs font-medium cursor-pointer rounded-lg py-1.5"
            >
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span>按访问频次 (由高到低)</span>
              </div>
              {sortBy === "clicks-desc" && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default FolderNav;
