import { Folder, Bookmark, Settings } from "@/types";

export const DEFAULT_FOLDERS: Folder[] = [];

export const DEFAULT_BOOKMARKS: Bookmark[] = [];


export const WALLPAPER_PRESETS = [
  {
    id: "snow-mountain-sunset",
    name: "雪山云海",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2560&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "obsidian-glow",
    name: "黑曜暗影",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "deep-space",
    name: "深邃星云",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2560&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "cyber-neon",
    name: "赛博霓虹",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2560&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "dark-mountains",
    name: "暗夜群峰",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2560&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "minimal-mesh",
    name: "纯黑极简",
    url: "", // empty means pure gradient
    thumb: "",
  },
];

export const DEFAULT_SETTINGS: Settings = {
  backgroundImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop",
  bgBlur: 10,
  bgOpacity: 0,
  searchEngine: "bing",
  clickSparkEnabled: true,
  navOpacity: 0.6,
  cardOpacity: 0.45,
  modalOpacity: 0.85,
};
