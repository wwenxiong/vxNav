"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function InteractiveHoverButton({
  children,
  className,
  icon,
  ...props
}: InteractiveHoverButtonProps) {
  return (
    <button
      className={cn(
        "group relative w-auto cursor-pointer overflow-hidden rounded-full border border-violet-500/30 bg-white/90 dark:bg-zinc-900/80 px-5 py-2 text-center text-sm font-semibold text-zinc-800 dark:text-white shadow-[0_0_15px_-3px_rgba(139,92,246,0.2)] transition-all duration-300 hover:border-violet-400 hover:shadow-[0_0_25px_-2px_rgba(139,92,246,0.4)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-violet-400 transition-all duration-300 group-hover:scale-[100.8]"></div>
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      <div className="absolute top-0 left-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <span>{children}</span>
        {icon || <ArrowRight className="h-4 w-4" />}
      </div>
    </button>
  );
}
export default InteractiveHoverButton;
