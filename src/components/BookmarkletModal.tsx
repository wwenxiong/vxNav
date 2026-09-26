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
import { BookmarkPlus, Copy, Check, MousePointerClick, ShieldCheck, Puzzle } from "lucide-react";

interface BookmarkletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookmarkletModal({ open, onOpenChange }: BookmarkletModalProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const bookmarkletCode = `javascript:(function(){var u=encodeURIComponent(window.location.href);var t=encodeURIComponent(document.title);window.open('${origin}/?quick_add=1&url='+u+'&title='+t,'_blank');})();`;

  // Safely assign href directly to the DOM element to bypass React's javascript: URL JSX security barrier
  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.setAttribute("href", bookmarkletCode);
    }
  }, [bookmarkletCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
              <BookmarkPlus className="h-4 w-4" />
            </span>
            <span>书签栏快捷收藏</span>
          </DialogTitle>
          <DialogDescription>
            将下方按钮拖入浏览器书签栏，即可在浏览网页时随时一键添加。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Draggable Button Box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/10 dark:bg-violet-950/20 p-6 text-center shadow-inner">
            <p className="text-xs text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
              <MousePointerClick className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              拖拽按钮至浏览器书签栏：
            </p>

            <a
              ref={linkRef}
              href="#"
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", bookmarkletCode);
                e.dataTransfer.setData("text/uri-list", bookmarkletCode);
              }}
              onClick={(e) => {
                e.preventDefault();
                alert("使用提示：\n\n1. 拖拽添加：按住按钮拖至浏览器书签栏。\n2. 手动添加：点击「复制脚本」，在书签栏新建书签，网址处粘贴即可。");
              }}
              className="inline-flex cursor-grab items-center gap-2 rounded-full border border-violet-400/50 bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-105 active:cursor-grabbing"
              title="按住拖拽至浏览器书签栏"
            >
              <BookmarkPlus className="h-4 w-4" />
              <span>收藏到 Obsidian 导航</span>
            </a>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>当前绑定地址:</span>
              <code className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-mono text-zinc-700 dark:text-zinc-300">
                {origin}
              </code>
            </div>
          </div>

          {/* Usage Steps */}
          <div className="space-y-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 text-xs text-zinc-800 dark:text-zinc-200">
            <h5 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              使用说明：
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
              <li>
                打开浏览器书签栏：Windows 快捷键 <kbd className="rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200/90 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 font-medium">Ctrl+Shift+B</kbd>，Mac 快捷键 <kbd className="rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200/90 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 font-medium">⌘+Shift+B</kbd>。
              </li>
              <li>
                浏览网页时，点击书签栏上的 <strong className="text-zinc-900 dark:text-zinc-100">「收藏到 Obsidian 导航」</strong>。
              </li>
              <li>
                系统将自动打开本站并获取网页标题与图标，点击确认即可完成收藏。
              </li>
            </ol>
          </div>

          {/* Extension Alternative */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 p-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-medium">
              <Puzzle className="h-4 w-4 text-sky-500 dark:text-sky-400" />
              <span>支持通过浏览器扩展直接收藏（详见 /extension 目录）</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 shrink-0 font-medium"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>复制脚本</span>
                </>
              )}
            </button>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            关闭
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BookmarkletModal;
