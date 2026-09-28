"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Settings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";
import {
  Sliders,
  LayoutTemplate,
  CreditCard,
  AppWindow,
  RotateCcw,
  X,
  Sparkles,
  Palette,
  GripHorizontal,
  Check,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "motion/react";

interface TransparencyPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
  onOpenBackgroundModal?: () => void;
}

export function TransparencyPanel({
  open,
  onClose,
  settings,
  onUpdateSettings,
  onOpenBackgroundModal,
}: TransparencyPanelProps) {
  const dragControls = useDragControls();

  // 1. High-frequency local state for 120Hz/144Hz instant response without whole-page React re-rendering
  const [navVal, setNavVal] = useState(() => Math.round((1 - (settings.navOpacity ?? 0.6)) * 100));
  const [cardVal, setCardVal] = useState(() => Math.round((1 - (settings.cardOpacity ?? 0.45)) * 100));
  const [modalVal, setModalVal] = useState(() => Math.round((1 - (settings.modalOpacity ?? 0.85)) * 100));
  const [bgVal, setBgVal] = useState(() => Math.round((1 - settings.bgOpacity) * 100));
  const [blurVal, setBlurVal] = useState(() => settings.bgBlur);

  const rafRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from outside if settings change (e.g. initial load or external preset reset)
  useEffect(() => {
    setNavVal(Math.round((1 - (settings.navOpacity ?? 0.6)) * 100));
    setCardVal(Math.round((1 - (settings.cardOpacity ?? 0.45)) * 100));
    setModalVal(Math.round((1 - (settings.modalOpacity ?? 0.85)) * 100));
    setBgVal(Math.round((1 - settings.bgOpacity) * 100));
    setBlurVal(settings.bgBlur);
  }, [
    settings.navOpacity,
    settings.cardOpacity,
    settings.modalOpacity,
    settings.bgOpacity,
    settings.bgBlur,
  ]);

  // Clean up RAF and timer on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Debounced store commit so we don't trigger heavy store re-renders on every mousemove pixel
  const debouncedCommit = useCallback(
    (updates: Partial<Settings>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onUpdateSettings(updates);
      }, 100);
    },
    [onUpdateSettings]
  );

  // 1. 导航栏滑块处理
  const handleNavChange = (val: number[]) => {
    const v = val[0];
    setNavVal(v);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--nav-opacity", String((100 - v) / 100));
    });
    debouncedCommit({ navOpacity: (100 - v) / 100 });
  };

  const handleNavCommit = (val: number[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onUpdateSettings({ navOpacity: (100 - val[0]) / 100 });
  };

  // 2. 卡片滑块处理
  const handleCardChange = (val: number[]) => {
    const v = val[0];
    setCardVal(v);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--card-opacity", String((100 - v) / 100));
    });
    debouncedCommit({ cardOpacity: (100 - v) / 100 });
  };

  const handleCardCommit = (val: number[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onUpdateSettings({ cardOpacity: (100 - val[0]) / 100 });
  };

  // 3. 弹窗滑块处理
  const handleModalChange = (val: number[]) => {
    const v = val[0];
    setModalVal(v);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--modal-opacity", String((100 - v) / 100));
    });
    debouncedCommit({ modalOpacity: (100 - v) / 100 });
  };

  const handleModalCommit = (val: number[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onUpdateSettings({ modalOpacity: (100 - val[0]) / 100 });
  };

  // 4. 背景遮罩处理
  const handleBgChange = (val: number[]) => {
    const v = val[0];
    setBgVal(v);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--bg-opacity", String((100 - v) / 100));
    });
    debouncedCommit({ bgOpacity: (100 - v) / 100 });
  };

  const handleBgCommit = (val: number[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onUpdateSettings({ bgOpacity: (100 - val[0]) / 100 });
  };

  // 5. 背景模糊处理
  const handleBlurChange = (val: number[]) => {
    const v = val[0];
    setBlurVal(v);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--bg-blur", `${v}px`);
    });
    debouncedCommit({ bgBlur: v });
  };

  const handleBlurCommit = (val: number[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onUpdateSettings({ bgBlur: val[0] });
  };

  const handleReset = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const navT = Math.round((1 - DEFAULT_SETTINGS.navOpacity) * 100);
    const cardT = Math.round((1 - DEFAULT_SETTINGS.cardOpacity) * 100);
    const modalT = Math.round((1 - DEFAULT_SETTINGS.modalOpacity) * 100);
    const bgT = Math.round((1 - DEFAULT_SETTINGS.bgOpacity) * 100);
    const blurT = DEFAULT_SETTINGS.bgBlur;

    setNavVal(navT);
    setCardVal(cardT);
    setModalVal(modalT);
    setBgVal(bgT);
    setBlurVal(blurT);

    const root = document.documentElement;
    root.style.setProperty("--nav-opacity", String(DEFAULT_SETTINGS.navOpacity));
    root.style.setProperty("--card-opacity", String(DEFAULT_SETTINGS.cardOpacity));
    root.style.setProperty("--modal-opacity", String(DEFAULT_SETTINGS.modalOpacity));
    root.style.setProperty("--bg-opacity", String(DEFAULT_SETTINGS.bgOpacity));
    root.style.setProperty("--bg-blur", `${blurT}px`);

    onUpdateSettings({
      bgBlur: blurT,
      bgOpacity: DEFAULT_SETTINGS.bgOpacity,
      navOpacity: DEFAULT_SETTINGS.navOpacity,
      cardOpacity: DEFAULT_SETTINGS.cardOpacity,
      modalOpacity: DEFAULT_SETTINGS.modalOpacity,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          drag
          dragListener={false}
          dragControls={dragControls}
          dragMomentum={false}
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed right-4 sm:right-7 top-20 z-50 w-[320px] sm:w-[350px] max-w-[calc(100vw-32px)] rounded-3xl border border-white/70 dark:border-white/15 bg-[var(--glass-modal-bg)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_0_30px_rgba(139,92,246,0.15)] backdrop-blur-2xl p-4 sm:p-5 select-none text-[var(--foreground)]"
          style={{ touchAction: "none" }}
        >
          {/* Draggable Header */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-between pb-3.5 border-b border-zinc-200/70 dark:border-white/10 cursor-move"
            title="按住拖拽移动悬浮窗位置"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-sm">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>实时透明度调节</span>
                  <GripHorizontal className="h-3 w-3 text-zinc-400 opacity-60" />
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  可拖动窗口 · 边调节边看页面变化
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="重置为默认值"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="完成并关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sliders Body */}
          <div className="space-y-4 pt-4">
            {/* 1. 导航栏透明度 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <LayoutTemplate className="h-3.5 w-3.5 text-indigo-500" />
                  <span>导航栏透明度</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold text-xs">
                  {navVal}%
                </span>
              </div>
              <Slider
                value={[navVal]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleNavChange}
                onValueCommit={handleNavCommit}
              />
            </div>

            {/* 2. 卡片透明度 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-violet-500" />
                  <span>书签卡片透明度</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold text-xs">
                  {cardVal}%
                </span>
              </div>
              <Slider
                value={[cardVal]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleCardChange}
                onValueCommit={handleCardCommit}
              />
            </div>

            {/* 3. 弹窗透明度 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <AppWindow className="h-3.5 w-3.5 text-emerald-500" />
                  <span>弹窗与菜单透明度</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold text-xs">
                  {modalVal}%
                </span>
              </div>
              <Slider
                value={[modalVal]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleModalChange}
                onValueCommit={handleModalCommit}
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-200/60 dark:bg-white/10 my-1" />

            {/* 4. 背景遮罩深度 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-amber-500" />
                  <span>壁纸遮罩深度</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold text-xs">
                  {bgVal}%
                </span>
              </div>
              <Slider
                value={[bgVal]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleBgChange}
                onValueCommit={handleBgCommit}
              />
            </div>

            {/* 5. 背景模糊度 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                  <span>壁纸模糊度</span>
                </span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-bold text-xs">
                  {blurVal}px
                </span>
              </div>
              <Slider
                value={[blurVal]}
                min={0}
                max={25}
                step={1}
                onValueChange={handleBlurChange}
                onValueCommit={handleBlurCommit}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-zinc-200/70 dark:border-white/10">
            {onOpenBackgroundModal ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackgroundModal();
                }}
                className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold transition-colors cursor-pointer"
              >
                <Palette className="h-3.5 w-3.5" />
                <span>更换壁纸库</span>
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>完成</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TransparencyPanel;
