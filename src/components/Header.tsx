"use client";

import React, { useRef } from "react";
import { SearchEngine, Settings } from "@/types";
import { useTheme } from "next-themes";
import {
  Search,
  Plus,
  BookmarkPlus,
  Palette,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Command,
  Compass,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Globe,
  Cloud,
  RefreshCw,
  LogOut,
  FileCode,
} from "lucide-react";
import { AuthUser, SyncStatus } from "@/hooks/useBookmarkStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
  onOpenAddModal?: () => void;
  onOpenBackgroundModal: () => void;
  onOpenBookmarkletModal: () => void;
  onExportData: () => void;
  onExportHtml?: () => void;
  onImportData: (jsonStr: string) => { success: boolean; error?: string };
  onImportBrowserHtml: (htmlStr: string) => {
    success: boolean;
    importedBookmarks?: number;
    totalFound?: number;
    importedFolders?: number;
    totalFolders?: number;
    error?: string;
  };
  onResetDefaults: () => void;
  user?: AuthUser | null;
  syncStatus?: SyncStatus;
  lastSyncedAt?: number | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onSyncNow?: () => void;
}

const BingIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
    <path
      d="M5.5 3v13.5l4.5 2.5 7.5-4.5-3.5-2.5 5.5-3.5L13.5 3 5.5 3z"
      fill="#008394"
      opacity="0.3"
    />
    <path
      d="M5.5 3l4.5 2.5v11.5L5.5 14.5V3z"
      fill="#008AD7"
    />
    <path
      d="M10 5.5l7 4.5-5.5 3.5 3 2.5-4.5 3v-3l3-2-3.5-2.5.5-8z"
      fill="#0070B8"
    />
    <path
      d="M10 5.5l4 2.5v7l-4-2.5v-7z"
      fill="#00B0F0"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const BaiduIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
    <ellipse cx="6" cy="7" rx="2" ry="2.8" fill="#2932E1" />
    <ellipse cx="11" cy="4.8" rx="2.1" ry="3" fill="#2932E1" />
    <ellipse cx="16" cy="5.8" rx="2" ry="2.9" fill="#2932E1" />
    <ellipse cx="19.5" cy="10" rx="1.8" ry="2.6" fill="#2932E1" />
    <path
      d="M7 16c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 4-5 4-5-1.2-5-4z"
      fill="#E1251B"
    />
    <path
      d="M11.5 13.5h1c.8 0 1.2.4 1.2 1 0 .5-.3.8-.8.9l1 1.4h-.9l-.9-1.3h-.6v1.3h-.7v-3.3zm.7 1.4h.4c.4 0 .6-.2.6-.5s-.2-.4-.6-.4h-.4v.9z"
      fill="#FFFFFF"
    />
  </svg>
);

const SEARCH_ENGINES: { id: SearchEngine; name: string; url: string; icon: React.ReactNode }[] = [
  { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=", icon: <BingIcon /> },
  { id: "google", name: "Google", url: "https://www.google.com/search?q=", icon: <GoogleIcon /> },
  { id: "baidu", name: "百度", url: "https://www.baidu.com/s?wd=", icon: <BaiduIcon /> },
];

export function Header({
  searchQuery,
  onSearchChange,
  settings,
  onUpdateSettings,
  onOpenAddModal,
  onOpenBackgroundModal,
  onOpenBookmarkletModal,
  onExportData,
  onExportHtml,
  onImportData,
  onImportBrowserHtml,
  onResetDefaults,
  user,
  syncStatus,
  lastSyncedAt,
  onOpenAuthModal,
  onLogout,
  onSyncNow,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const currentEngine =
    SEARCH_ENGINES.find((s) => s.id === settings.searchEngine) || SEARCH_ENGINES[0];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const currentEngine =
        SEARCH_ENGINES.find((s) => s.id === settings.searchEngine) || SEARCH_ENGINES[0];
      window.open(currentEngine.url + encodeURIComponent(searchQuery.trim()), "_blank");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const res = onImportData(text);
        if (res.success) {
          alert("数据导入成功");
        } else {
          alert("导入失败: " + (res.error || "文件格式不正确"));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportHtmlFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const res = onImportBrowserHtml(text);
        if (res.success) {
          alert(
            `导入成功：解析到 ${res.totalFound || 0} 个书签，自动整理为 ${res.totalFolders || 0} 个分类，新增 ${res.importedBookmarks || 0} 个书签。`
          );
        } else {
          alert("导入失败: " + (res.error || "文件格式不正确"));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-all">
      <div className="flex w-full items-center justify-between gap-6 px-6 py-4 sm:px-10">
        {/* Brand Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-violet-400/40">
            <Compass className="h-6 w-6 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-violet-400/20 blur-md -z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--foreground)] text-shadow-contrast">
                Obsidian<span className="text-violet-500 dark:text-violet-400">Nav</span>
              </span>
            </div>
            <p className="hidden text-xs text-zinc-600 dark:text-zinc-300 font-medium sm:block text-shadow-contrast">
              个人导航空间
            </p>
          </div>
        </div>

        {/* Global Search Bar - Refined Pill matching reference screenshot */}
        <div className="flex-1 max-w-xl">
          <div className="relative flex items-center rounded-full border border-white/70 dark:border-white/15 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all focus-within:border-violet-500/60 focus-within:shadow-[0_4px_24px_rgba(139,92,246,0.15)] h-11">
            {/* Search Engine Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer select-none text-zinc-800 dark:text-zinc-100"
                  title="切换搜索引擎"
                >
                  {currentEngine.icon}
                  <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                    {currentEngine.name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                {SEARCH_ENGINES.map((engine) => (
                  <DropdownMenuItem
                    key={engine.id}
                    onClick={() => onUpdateSettings({ searchEngine: engine.id })}
                    className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-100 font-semibold cursor-pointer"
                  >
                    {engine.icon}
                    <span>{engine.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="搜索你感兴趣的内容或网站..."
              className="flex-1 bg-transparent py-2 px-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-400 outline-none font-medium text-shadow-contrast min-w-0"
            />

            {/* Shortcut Indicator ⌘ K */}
            <div className="pointer-events-none pr-3 flex items-center shrink-0">
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-full bg-zinc-100/90 dark:bg-white/10 border border-zinc-200/60 dark:border-white/10 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                <Command className="h-3 w-3" /> K
              </kbd>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle Button (Circular frosted icon button) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 dark:border-white/10 bg-white/75 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-all hover:scale-105 shadow-sm"
            title={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Unified Settings Dropdown (Circular frosted icon button) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 dark:border-white/10 bg-white/75 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-all hover:scale-105 shadow-sm"
                title="设置与数据"
              >
                <SettingsIcon className="h-4.5 w-4.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onOpenBackgroundModal}>
                <Palette className="mr-2 h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-zinc-800 dark:text-zinc-100 font-medium">外观与背景</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={onOpenBookmarkletModal}>
                <BookmarkPlus className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-zinc-800 dark:text-zinc-100 font-medium">书签栏快捷收藏</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {onExportHtml && (
                <DropdownMenuItem onClick={onExportHtml}>
                  <FileCode className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-zinc-800 dark:text-zinc-100 font-medium">导出浏览器书签 (HTML)</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={onExportData}>
                <Download className="mr-2 h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span className="text-zinc-800 dark:text-zinc-100 font-medium">导出书签备份 (JSON)</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => htmlFileInputRef.current?.click()}>
                <Globe className="mr-2 h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-zinc-800 dark:text-zinc-100 font-medium">导入浏览器书签</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-zinc-800 dark:text-zinc-100 font-medium">导入书签备份 (JSON)</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  if (confirm("确定要清空所有分类与书签吗？此操作不可撤销。")) {
                    onResetDefaults();
                  }
                }}
                className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40 focus:text-red-700 dark:focus:text-red-300 font-medium"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>清空所有数据</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cloud Sync Button / User Profile Pill (Wayne pill style from screenshot) */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-white/50 dark:border-white/10 bg-white/75 dark:bg-zinc-800/80 pl-2 pr-3 py-1.5 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-white hover:text-black dark:hover:text-zinc-200 hover:border-violet-500/40 transition-all shadow-sm"
                  title="云端同步正常"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-bold text-xs uppercase shadow-sm">
                    {user.username.slice(0, 1)}
                  </div>
                  <span className="max-w-[80px] truncate text-xs font-semibold sm:text-sm">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-zinc-400">▼</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    已登录: {user.username}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {syncStatus === "syncing"
                      ? "正在同步..."
                      : lastSyncedAt
                      ? `已同步 (${new Date(lastSyncedAt).toLocaleTimeString()})`
                      : "实时同步已开启"}
                  </p>
                </div>

                {onSyncNow && (
                  <DropdownMenuItem onClick={onSyncNow} className="text-xs font-medium cursor-pointer">
                    <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin text-violet-500" : "text-emerald-500"}`} />
                    <span>立即同步</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {onLogout && (
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-xs text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40 cursor-pointer font-medium"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-600/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white transition-all shadow-sm"
              title="登录或注册账号以开启跨端实时同步"
            >
              <Cloud className="h-4 w-4" />
              <span>登录</span>
            </button>
          )}


          {/* Hidden file inputs for import */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <input
            type="file"
            ref={htmlFileInputRef}
            accept=".html,.htm"
            onChange={handleImportHtmlFile}
            className="hidden"
          />
        </div>
      </div>
    </header>
  );
}

export default Header;
