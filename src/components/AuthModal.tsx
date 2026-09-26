"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User, Lock, UserPlus, LogIn, Cloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (user: { id: string; username: string }) => void;
  localBookmarksCount: number;
}

export function AuthModal({
  open,
  onOpenChange,
  onLoginSuccess,
  localBookmarksCount,
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [migrateLocal, setMigrateLocal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("请输入用户名");
      return;
    }

    if (password.length < 6) {
      setError("密码不能少于 6 位");
      return;
    }

    if (tab === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      if (tab === "register") {
        // Collect current local data for initial sync if enabled
        let initialData = undefined;
        if (migrateLocal && typeof window !== "undefined") {
          try {
            const rawFolders = localStorage.getItem("nav_obsidian_folders_v1");
            const rawBms = localStorage.getItem("nav_obsidian_bookmarks_v1");
            const rawSettings = localStorage.getItem("nav_obsidian_settings_v1");
            initialData = {
              folders: rawFolders ? JSON.parse(rawFolders) : [],
              bookmarks: rawBms ? JSON.parse(rawBms) : [],
              settings: rawSettings ? JSON.parse(rawSettings) : {},
            };
          } catch {
            // Ignore
          }
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUsername,
            password,
            initialData,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "注册失败");
          return;
        }

        onLoginSuccess(data.user);
        onOpenChange(false);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "登录失败，用户名或密码错误");
          return;
        }

        onLoginSuccess(data.user);
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("网络错误或服务异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-500 dark:text-violet-400 border border-violet-500/30">
              <Cloud className="h-4 w-4" />
            </span>
            <span>{tab === "login" ? "账号登录" : "注册账号"}</span>
          </DialogTitle>
          <DialogDescription>
            登录后可在多设备间自动同步书签与设置。
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5 ${
              tab === "login"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>登录</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5 ${
              tab === "register"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>注册</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              用户名
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 py-2.5 pl-9 pr-3.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
              <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              密码
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码 (至少6位)"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 py-2.5 pl-9 pr-3.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
              <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </div>
          </div>

          {tab === "register" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                确认密码
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 py-2.5 pl-9 pr-3.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
                />
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              </div>
            </div>
          )}

          {tab === "register" && localBookmarksCount > 0 && (
            <label className="flex items-center gap-2 pt-1 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={migrateLocal}
                onChange={(e) => setMigrateLocal(e.target.checked)}
                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
              />
              <span>将当前本地的 {localBookmarksCount} 个书签合并至该账号</span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:opacity-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>处理中...</span>
              </>
            ) : tab === "login" ? (
              <>
                <LogIn className="h-4 w-4" />
                <span>登录</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>注册</span>
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
