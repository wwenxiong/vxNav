"use client";

import React, { useState } from "react";
import { Folder } from "@/types";
import {
  CheckSquare,
  Square,
  FolderInput,
  Trash2,
  Pin,
  X,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BatchActionBarProps {
  selectedIds: string[];
  totalVisibleCount: number;
  folders: Folder[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchMove: (targetFolderId: string) => void;
  onBatchDelete: () => void;
  onBatchTogglePin: (pinned: boolean) => void;
  onExitBatchMode: () => void;
}

export function BatchActionBar({
  selectedIds,
  totalVisibleCount,
  folders,
  onSelectAll,
  onClearSelection,
  onBatchMove,
  onBatchDelete,
  onBatchTogglePin,
  onExitBatchMode,
}: BatchActionBarProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const count = selectedIds.length;
  const isAllSelected = count > 0 && count >= totalVisibleCount;

  const handleDeleteClick = () => {
    if (count === 0) return;
    if (confirm(`确定要彻底删除选中的 ${count} 个网址标签吗？此操作无法恢复。`)) {
      onBatchDelete();
    }
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[94vw] sm:max-w-fit"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-full border border-white/70 dark:border-white/15 bg-[var(--glass-nav-bg)] px-4 py-2 sm:px-5 sm:py-2.5 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] select-none">
        {/* Count Badge */}
        <div className="flex items-center gap-2 pr-1 border-r border-zinc-200 dark:border-white/10 shrink-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-sm">
            {count}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            已选择
          </span>
        </div>

        {/* Select All / Deselect Toggle */}
        <button
          type="button"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          {isAllSelected ? (
            <>
              <Square className="h-3.5 w-3.5 text-zinc-400" />
              <span>取消全选</span>
            </>
          ) : (
            <>
              <CheckSquare className="h-3.5 w-3.5 text-violet-500" />
              <span>全选</span>
            </>
          )}
        </button>

        {/* Move to Folder Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <FolderInput className="h-3.5 w-3.5 text-indigo-500" />
              <span>移动分类</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48 max-h-60 overflow-y-auto">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">
              移动至目标分类
            </div>
            <DropdownMenuSeparator />
            {folders.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => onBatchMove(f.id)}
                className="flex items-center gap-2 text-xs font-medium cursor-pointer"
              >
                <span>📁</span>
                <span className="truncate">{f.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onBatchMove("")}
              className="flex items-center gap-2 text-xs font-medium cursor-pointer text-zinc-500"
            >
              <span>📂</span>
              <span>未分类</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pin / Unpin Action Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={count === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Pin className="h-3.5 w-3.5 text-amber-500" />
              <span>置顶</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-36">
            <DropdownMenuItem
              onClick={() => onBatchTogglePin(true)}
              className="text-xs font-medium cursor-pointer flex items-center gap-2"
            >
              <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>批量置顶</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onBatchTogglePin(false)}
              className="text-xs font-medium cursor-pointer flex items-center gap-2"
            >
              <Pin className="h-3.5 w-3.5 text-zinc-400 rotate-45" />
              <span>取消置顶</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete Action Button */}
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={count === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>删除</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-200 dark:bg-white/10 mx-0.5 shrink-0" />

        {/* Exit Button */}
        <button
          type="button"
          onClick={onExitBatchMode}
          className="flex items-center gap-1 rounded-full p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="退出批量管理"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default BatchActionBar;
