export interface Folder {
  id: string;
  name: string;
  order: number;
}

export interface Bookmark {
  id: string;
  folderId: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  pinned?: boolean;
  clickCount?: number;
  createdAt: number;
  updatedAt?: number;
}

export type SearchEngine = "google" | "bing" | "baidu" | "github";

export type SortOption = "default" | "time-desc" | "time-asc" | "clicks-desc";

export interface Settings {
  backgroundImage: string;
  bgBlur: number; // 0 to 25
  bgOpacity: number; // 0 to 1
  searchEngine: SearchEngine;
  clickSparkEnabled: boolean;
  navOpacity: number; // 0 to 1 (0 full transparent, 1 full opaque)
  cardOpacity: number; // 0 to 1
  modalOpacity: number; // 0 to 1
}

export interface MetadataResponse {
  title: string;
  description: string;
  icon: string;
  url: string;
  domain: string;
}
