"use client";

import React, { useState, useRef } from "react";
import { Bookmark, Folder } from "@/types";
import { MoreVertical, Pin, Trash2, Edit3, Copy, Check, Globe, ExternalLink, Flame } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { stripEmojis } from "@/lib/utils";

interface BookmarkCardProps {
  bookmark: Bookmark;
  folder?: Folder;
  onVisit: (id: string) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent, id: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function BookmarkCard({
  bookmark,
  folder,
  onVisit,
  onEdit,
  onDelete,
  onTogglePin,
  draggable = true,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragging = false,
  isDragOver = false,
}: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Scroll-linked progress animation:
  // Starts when card enters bottom of viewport ("start end", progress 0)
  // Completes when card reaches 70% from top of viewport ("start 70%", progress 1)
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "start 70%"],
  });

  // Spring physics smoothing for seamless wheel tracking without stutter
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 32,
    restDelta: 0.001,
  });

  // Smooth progression: 0.85 -> 1.0 scale, 0.5 -> 1.0 opacity
  const scale = useTransform(smoothProgress, [0, 1], [0.85, 1]);
  const opacity = useTransform(smoothProgress, [0, 1], [0.5, 1]);

  // Extract clean domain for display
  let domain = "";
  try {
    domain = new URL(bookmark.url).hostname.replace("www.", "");
  } catch {
    domain = bookmark.url;
  }

  const cleanTitle = stripEmojis(bookmark.title) || domain || "网站链接";
  const cleanDescription = stripEmojis(bookmark.description || "");

  const handleDragStartInternal = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-card-click]")) {
      e.preventDefault();
      return;
    }
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bookmark.id);
    onDragStart?.(e, bookmark.id);
  };

  const handleDragEndInternal = (e: React.DragEvent) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
    onDragEnd?.(e);
  };

  const handleDragOverInternal = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver?.(e);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(e, bookmark.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-card-click]")) {
      return;
    }
    onVisit(bookmark.id);
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bookmark.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStartInternal}
      onDragEnd={handleDragEndInternal}
      onDragOver={handleDragOverInternal}
      onDragEnter={(e) => onDragEnter?.(e, bookmark.id)}
      onDragLeave={onDragLeave}
      onDrop={handleDropInternal}
      className={`relative rounded-2xl transition-all duration-200 ${
        isDragging
          ? "opacity-35 scale-95"
          : isDragOver
          ? "ring-2 ring-violet-500 scale-[1.02] shadow-[0_0_25px_rgba(139,92,246,0.35)]"
          : ""
      }`}
    >
      <motion.div
        ref={cardRef}
        style={{
          scale,
          opacity,
          transformOrigin: "center top",
        }}
        whileHover={{ y: isDragging ? 0 : -3 }}
        onClick={handleCardClick}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 select-none ${
          isDragging
            ? "border-dashed border-violet-500 bg-violet-500/10 cursor-grabbing"
            : isDragOver
            ? "border-violet-500 bg-white/95 dark:bg-zinc-800/95"
            : "border-white/60 dark:border-white/10 bg-white/85 dark:bg-zinc-900/85 hover:border-violet-400/50 hover:shadow-[0_12px_30px_-5px_rgba(139,92,246,0.18),0_4px_20px_rgba(0,0,0,0.06)] cursor-grab active:cursor-grabbing"
        } p-4 sm:p-4.5 backdrop-blur-xl`}
      >
      {/* Top row: Icon, Title, and Actions */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Favicon Icon container - rounded-2xl squircle matching reference */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-md shadow-sm group-hover:border-violet-400/40 transition-colors">
            {!imgError && bookmark.icon ? (
              <img
                src={bookmark.icon}
                alt={cleanTitle}
                className="h-6 w-6 object-contain transition-transform duration-300 group-hover:scale-110"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-500/10 dark:bg-violet-400/10">
                <Globe className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            )}
          </div>

          {/* Title and Domain container */}
          <div className="min-w-0 flex-1 py-0.5">
            <h4
              title={cleanTitle}
              className="line-clamp-1 text-sm font-bold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors text-shadow-contrast break-words"
            >
              {cleanTitle}
            </h4>
            <p
              title={bookmark.url}
              className="truncate text-xs font-mono text-zinc-500 dark:text-zinc-400 transition-colors font-medium text-shadow-contrast mt-0.5"
            >
              {domain}
            </p>
          </div>
        </div>

        {/* Action dropdown and pin badge */}
        <div data-no-card-click="true" className="shrink-0 flex items-center gap-1">
          {bookmark.pinned && (
            <span
              title="已置顶"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400"
            >
              <Pin className="h-3 w-3 fill-current rotate-45" />
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-lg p-1 text-zinc-400 dark:text-zinc-400 opacity-60 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white hover:opacity-100 focus:opacity-100"
                aria-label="操作菜单"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(bookmark.id);
                }}
              >
                <Pin className="mr-2 h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>{bookmark.pinned ? "取消置顶" : "置顶"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(bookmark);
                }}
              >
                <Edit3 className="mr-2 h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>编辑</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
                    <span>复制链接</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bookmark.id);
                }}
                className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40 focus:text-red-700 dark:focus:text-red-300"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                <span>删除</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2.5 line-clamp-2 min-h-[2.2rem] text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal text-shadow-contrast">
        {cleanDescription || "暂无描述"}
      </p>

      {/* Card Footer: Folder Pill Tag & Visit Count on Left, External Link Icon on Right */}
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {folder ? (
            <span className="inline-flex items-center rounded-full bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40 px-2.5 py-0.5 text-[11px] font-semibold text-shadow-contrast truncate max-w-[85px]">
              {stripEmojis(folder.name)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 text-[11px] font-semibold">
              常用
            </span>
          )}

          {/* 访问统计标签 */}
          <span
            title={`已访问 ${bookmark.clickCount || 0} 次`}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 dark:border-amber-400/20 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-700 dark:text-amber-300 shrink-0"
          >
            <Flame className="h-2.5 w-2.5 text-amber-500 fill-amber-500/40" />
            <span>{bookmark.clickCount || 0} 次</span>
          </span>
        </div>

        <span className="flex items-center text-zinc-400 dark:text-zinc-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors shrink-0">
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.div>
  </div>
);
}

export default BookmarkCard;
