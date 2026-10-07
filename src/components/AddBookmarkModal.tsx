"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Folder, Bookmark } from "@/types";
import { Globe, Sparkles, Check, Image as ImageIcon } from "lucide-react";
import LoaderGooeyBlobs from "@/components/ui/loaders-gooey-blobs";
import InteractiveHoverButton from "@/components/ui/interactive-hover-button";
import { stripEmojis } from "@/lib/utils";

interface AddBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  currentFolderId?: string;
  initialData?: Bookmark | null;
  onSave: (data: Omit<Bookmark, "id" | "createdAt">) => void;
  onUpdate?: (id: string, updates: Partial<Bookmark>) => void;
}

export function AddBookmarkModal({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  initialData,
  onSave,
  onUpdate,
}: AddBookmarkModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [folderId, setFolderId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [autoFetched, setAutoFetched] = useState(false);
  const lastFetchedUrl = useRef<string>("");

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setUrl(initialData.url);
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setIcon(initialData.icon || "");
      setFolderId(initialData.folderId || folders[0]?.id || "");
      setPinned(!!initialData.pinned);
      setAutoFetched(false);

      // Auto fetch metadata if it's a quick-add from bookmarklet
      if (!initialData.id && initialData.url) {
        handleFetchMetadata(initialData.url);
      }
    } else {
      setUrl("");
      setTitle("");
      setDescription("");
      setIcon("");
      setFolderId(
        currentFolderId && currentFolderId !== "all" && currentFolderId !== "pinned"
          ? currentFolderId
          : folders[0]?.id || ""
      );
      setPinned(false);
      setAutoFetched(false);
    }
  }, [initialData, open, currentFolderId, folders]);

  // Handle URL auto fetch metadata
  const handleFetchMetadata = async (targetUrl: string) => {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    if (cleanUrl === lastFetchedUrl.current && autoFetched) return;
    lastFetchedUrl.current = cleanUrl;

    setLoadingMeta(true);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(cleanUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setTitle((prev) => (!prev || prev === cleanUrl ? data.title : prev));
        }
        if (data.description) {
          setDescription((prev) => (!prev ? data.description : prev));
        }
        if (data.icon) {
          setIcon((prev) => (!prev ? data.icon : prev));
        }
        setAutoFetched(true);
      }
    } catch (e) {
      console.error("Failed to auto fetch metadata", e);
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleUrlBlur = () => {
    if (url && (!title || !isEditing)) {
      handleFetchMetadata(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    const payload = {
      url: finalUrl,
      title: stripEmojis(title.trim()),
      description: stripEmojis(description.trim()),
      icon: icon.trim() || `https://www.google.com/s2/favicons?domain=${new URL(finalUrl).hostname}&sz=128`,
      folderId: folderId || folders[0]?.id || "",
      pinned,
    };

    if (isEditing && initialData?.id && onUpdate) {
      onUpdate(initialData.id, payload);
    } else {
      onSave(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-500 dark:text-violet-400 border border-violet-500/30">
              <Globe className="h-4 w-4" />
            </span>
            <span>{isEditing ? "编辑书签" : "添加书签"}</span>
          </DialogTitle>
          <DialogDescription>
            输入网址后可自动获取网站图标与标题。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>网址 (URL) *</span>
              {loadingMeta ? (
                <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-xs font-normal">
                  <LoaderGooeyBlobs size={6} className="py-0 inline-flex" />
                  <span>正在获取信息...</span>
                </span>
              ) : autoFetched ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <Check className="h-3 w-3" /> 已获取信息
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFetchMetadata(url)}
                  className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline underline-offset-2 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  获取信息
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="例如: https://github.com"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Title and Icon preview */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">名称 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如: GitHub"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
            </div>

            {/* Icon Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block text-center">图标</label>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/90 overflow-hidden shadow-inner">
                {icon ? (
                  <img
                    src={icon}
                    alt="Preview"
                    className="h-6 w-6 object-contain"
                    onError={() => setIcon("")}
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">简介 (选填)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入网站简介或备注..."
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-none font-medium"
            />
          </div>

          {/* Folder & Icon Override */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">分类</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              >
                {folders.length === 0 ? (
                  <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    默认分类
                  </option>
                ) : (
                  folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                      {f.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">图标链接 (选填)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Options: Pinned Checkbox */}
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <input
              type="checkbox"
              id="pinned-checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-violet-600 focus:ring-violet-500 cursor-pointer"
            />
            <label htmlFor="pinned-checkbox" className="text-xs text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer select-none">
              置顶显示
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              取消
            </button>
            <InteractiveHoverButton type="submit">
              {initialData ? "保存" : "添加"}
            </InteractiveHoverButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddBookmarkModal;
