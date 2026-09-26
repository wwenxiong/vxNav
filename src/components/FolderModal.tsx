"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Folder } from "@/types";
import { Folder as FolderIcon, Trash2 } from "lucide-react";
import InteractiveHoverButton from "@/components/ui/interactive-hover-button";
import { stripEmojis } from "@/lib/utils";

interface FolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderToEdit?: Folder | null;
  onSave: (name: string) => void;
  onUpdate?: (id: string, updates: Partial<Folder>) => void;
  onDelete?: (id: string) => void;
}

export function FolderModal({
  open,
  onOpenChange,
  folderToEdit,
  onSave,
  onUpdate,
  onDelete,
}: FolderModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
    } else {
      setName("");
    }
  }, [folderToEdit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = stripEmojis(name.trim());
    if (!cleanName) return;

    if (folderToEdit && onUpdate) {
      onUpdate(folderToEdit.id, { name: cleanName });
    } else {
      onSave(cleanName);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (folderToEdit && onDelete) {
      if (confirm(`确定要删除分类“${folderToEdit.name}”吗？其下的书签将归入其他分类。`)) {
        onDelete(folderToEdit.id);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <FolderIcon className="h-4 w-4" />
            </span>
            <span>{folderToEdit ? "编辑分类" : "新建分类"}</span>
          </DialogTitle>
          <DialogDescription>
            设置分类名称，用于归类书签。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Folder Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">分类名称 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入分类名称"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/90 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-medium"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 flex items-center justify-between">
            {folderToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl border border-red-300 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              <InteractiveHoverButton type="submit">
                {folderToEdit ? "保存" : "创建"}
              </InteractiveHoverButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FolderModal;
