import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Bookmark, Folder, Settings } from "@/types";

// Ensure data folder exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "nav.db");

// Singleton connection in Node environment
declare global {
  // eslint-disable-next-line no-var
  var __sqlite_db: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (!global.__sqlite_db) {
    const db = new Database(dbPath);
    // Performance optimizations for SQLite
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT PRIMARY KEY,
        folders TEXT NOT NULL,
        bookmarks TEXT NOT NULL,
        settings TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    global.__sqlite_db = db;
  }
  return global.__sqlite_db;
}

export const db = getDatabase();

// Password utilities using native node crypto
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verifyHash, "hex"));
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface UserRecord {
  id: string;
  username: string;
  created_at: number;
}

export interface UserDataRecord {
  user_id: string;
  folders: Folder[];
  bookmarks: Bookmark[];
  settings: Settings;
  version: number;
  updated_at: number;
}
