"use client";

import React, { useRef } from "react";
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
} from "lucide-react";

interface BackgroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function BackgroundModal({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
}: BackgroundModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateSettings({ backgroundImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
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

          {/* Custom URL or Local File Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">自定义壁纸</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.backgroundImage}
                onChange={(e) => onUpdateSettings({ backgroundImage: e.target.value })}
                placeholder="输入图片链接 https://..."
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
              />
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/90 px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>上传图片</span>
              </button>
            </div>
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
