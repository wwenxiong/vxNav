"use client";

import React, { useRef, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings } from "@/types";
import { WALLPAPER_PRESETS, DEFAULT_SETTINGS } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";
import {
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Sliders,
  LayoutTemplate,
  AppWindow,
  CreditCard,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";

interface BackgroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

// Client-side image compression to prevent exceeding localStorage quota
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webp = canvas.toDataURL("image/webp", 0.85);
          if (webp.startsWith("data:image/webp")) {
            resolve(webp);
            return;
          }
        } catch {
          // ignore
        }
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BackgroundModal({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
}: BackgroundModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");

  // Extract saved custom wallpapers and ensure current active custom wallpaper is preserved
  const savedCustomWallpapers = useMemo(() => {
    const list = [...(settings.customWallpapers || [])];
    if (
      settings.backgroundImage &&
      !WALLPAPER_PRESETS.some((p) => p.url === settings.backgroundImage) &&
      !list.includes(settings.backgroundImage)
    ) {
      list.unshift(settings.backgroundImage);
    }
    return list;
  }, [settings.customWallpapers, settings.backgroundImage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("图片过大，请选择 15MB 以内的图片");
      return;
    }

    try {
      setIsUploading(true);
      const compressedDataUrl = await compressImage(file);
      const currentList = settings.customWallpapers || [];
      const updatedList = [
        compressedDataUrl,
        ...currentList.filter((item) => item !== compressedDataUrl),
      ];
      onUpdateSettings({
        backgroundImage: compressedDataUrl,
        customWallpapers: updatedList,
      });
    } catch (err) {
      console.error("图片处理失败", err);
      alert("图片处理失败，请重试");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    const currentList = settings.customWallpapers || [];
    const updatedList = [trimmed, ...currentList.filter((item) => item !== trimmed)];
    onUpdateSettings({
      backgroundImage: trimmed,
      customWallpapers: updatedList,
    });
    setCustomUrlInput("");
  };

  const handleDeleteCustomWallpaper = (e: React.MouseEvent, urlToDelete: string) => {
    e.stopPropagation();
    const currentList = settings.customWallpapers || [];
    const updatedList = currentList.filter((item) => item !== urlToDelete);
    const updates: Partial<Settings> = { customWallpapers: updatedList };
    if (settings.backgroundImage === urlToDelete) {
      updates.backgroundImage = updatedList[0] || DEFAULT_SETTINGS.backgroundImage;
    }
    onUpdateSettings(updates);
  };

  const handleReset = () => {
    onUpdateSettings({
      backgroundImage: DEFAULT_SETTINGS.backgroundImage,
      bgBlur: DEFAULT_SETTINGS.bgBlur,
      bgOpacity: DEFAULT_SETTINGS.bgOpacity,
      clickSparkEnabled: DEFAULT_SETTINGS.clickSparkEnabled,
      navOpacity: DEFAULT_SETTINGS.navOpacity,
      cardOpacity: DEFAULT_SETTINGS.cardOpacity,
      modalOpacity: DEFAULT_SETTINGS.modalOpacity,
    });
  };

  // Convert opacity (0 to 1) to transparency percentage (0 to 100)
  const navTransparency = Math.round((1 - (settings.navOpacity ?? 0.6)) * 100);
  const cardTransparency = Math.round((1 - (settings.cardOpacity ?? 0.45)) * 100);
  const modalTransparency = Math.round((1 - (settings.modalOpacity ?? 0.85)) * 100);
  const bgTransparency = Math.round((1 - settings.bgOpacity) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-500 dark:text-violet-400 border border-violet-500/30">
              <ImageIcon className="h-4 w-4" />
            </span>
            <span>外观与背景设置</span>
          </DialogTitle>
          <DialogDescription>
            自定义壁纸图片与界面透明度。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1 max-h-[70vh] overflow-y-auto pr-1">
          {/* Preset Wallpapers */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">预设壁纸</label>
            <div className="grid grid-cols-3 gap-2.5">
              {WALLPAPER_PRESETS.map((preset) => {
                const isSelected = settings.backgroundImage === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdateSettings({ backgroundImage: preset.url })}
                    className={`group relative h-20 overflow-hidden rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-violet-500 ring-2 ring-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {preset.url ? (
                      <img
                        src={preset.thumb || preset.url}
                        alt={preset.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-400 dark:from-zinc-900 dark:to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                      <span className="text-[11px] font-medium text-white truncate">
                        {preset.name}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white shadow">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Wallpapers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>自定义壁纸</span>
                <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                  (已保存 {savedCustomWallpapers.length} 张)
                </span>
              </label>
            </div>

            {/* URL Input & Upload Controls */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveCustomUrl();
                  }
                }}
                placeholder="输入网络图片链接 https://..."
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
              {customUrlInput.trim() && (
                <button
                  type="button"
                  onClick={handleSaveCustomUrl}
                  className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>保存</span>
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/90 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600 dark:text-violet-400" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                )}
                <span>{isUploading ? "处理中..." : "上传本地图片"}</span>
              </button>
            </div>

            {/* Saved Custom Wallpapers Grid */}
            {savedCustomWallpapers.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {savedCustomWallpapers.map((url, index) => {
                  const isSelected = settings.backgroundImage === url;
                  return (
                    <div
                      key={`${url.slice(0, 32)}-${index}`}
                      onClick={() => onUpdateSettings({ backgroundImage: url })}
                      className={`group relative h-20 overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-violet-500 ring-2 ring-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`自定义壁纸 ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2">
                        <span className="text-[11px] font-medium text-white truncate max-w-[70px]">
                          自定义 {index + 1}
                        </span>
                      </div>

                      {/* Selected Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white shadow">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Delete Button on Hover */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomWallpaper(e, url)}
                        className="absolute left-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 items-center justify-center rounded-full bg-black/70 hover:bg-red-600 text-white/90 hover:text-white shadow-sm"
                        title="删除此壁纸"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                <span>暂无已保存的自定义壁纸</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  点击上方「上传本地图片」或输入链接，壁纸将自动保存在此处随时复用
                </span>
              </div>
            )}
          </div>

          {/* Section: Background Effect Sliders */}
          <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <Sliders className="h-3.5 w-3.5 text-violet-500" />
              <span>背景效果</span>
            </h4>

            {/* Background Blur */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">模糊度</span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">{settings.bgBlur}px</span>
              </div>
              <Slider
                value={[settings.bgBlur]}
                min={0}
                max={25}
                step={1}
                onValueChange={(val) => onUpdateSettings({ bgBlur: val[0] })}
              />
            </div>

            {/* Background Transparency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">遮罩深度</span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">
                  {bgTransparency}%
                </span>
              </div>
              <Slider
                value={[bgTransparency]}
                min={0}
                max={100}
                step={5}
                onValueChange={(val) => onUpdateSettings({ bgOpacity: (100 - val[0]) / 100 })}
              />
            </div>
          </div>

          {/* Section: UI Elements Transparency Sliders */}
          <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <LayoutTemplate className="h-3.5 w-3.5 text-indigo-500" />
              <span>组件透明度</span>
            </h4>

            {/* 1. Navigation Bar Transparency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <LayoutTemplate className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  <span>导航栏</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">
                  {navTransparency}%
                </span>
              </div>
              <Slider
                value={[navTransparency]}
                min={0}
                max={100}
                step={5}
                onValueChange={(val) => onUpdateSettings({ navOpacity: (100 - val[0]) / 100 })}
              />
            </div>

            {/* 2. Card Transparency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  <span>卡片</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">
                  {cardTransparency}%
                </span>
              </div>
              <Slider
                value={[cardTransparency]}
                min={0}
                max={100}
                step={5}
                onValueChange={(val) => onUpdateSettings({ cardOpacity: (100 - val[0]) / 100 })}
              />
            </div>

            {/* 3. Modal / Dialog Transparency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <AppWindow className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                  <span>弹窗</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">
                  {modalTransparency}%
                </span>
              </div>
              <Slider
                value={[modalTransparency]}
                min={0}
                max={100}
                step={5}
                onValueChange={(val) => onUpdateSettings({ modalOpacity: (100 - val[0]) / 100 })}
              />
            </div>

            {/* Click Spark Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">鼠标点击动效</span>
              </div>
              <input
                type="checkbox"
                checked={settings.clickSparkEnabled}
                onChange={(e) => onUpdateSettings({ clickSparkEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-violet-600 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white font-medium transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>恢复默认</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            完成
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BackgroundModal;
