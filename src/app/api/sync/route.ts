import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Bookmark, Folder, Settings } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const row = db
      .prepare(
        `SELECT folders, bookmarks, settings, version, updated_at 
         FROM user_data 
         WHERE user_id = ?`
      )
      .get(user.id) as
      | {
          folders: string;
          bookmarks: string;
          settings: string;
          version: number;
          updated_at: number;
        }
      | undefined;

    if (!row) {
      return NextResponse.json({
        folders: [],
        bookmarks: [],
        settings: {},
        version: 1,
        updated_at: Date.now(),
      });
    }

    return NextResponse.json({
      folders: JSON.parse(row.folders || "[]") as Folder[],
      bookmarks: JSON.parse(row.bookmarks || "[]") as Bookmark[],
      settings: JSON.parse(row.settings || "{}") as Settings,
      version: row.version,
      updated_at: row.updated_at,
    });
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "拉取云端同步数据失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await req.json();
    const { folders, bookmarks, settings, clientVersion } = body;

    const foldersJson = JSON.stringify(Array.isArray(folders) ? folders : []);
    const bookmarksJson = JSON.stringify(Array.isArray(bookmarks) ? bookmarks : []);
    const settingsJson = JSON.stringify(settings || {});
    const now = Date.now();

    // Check existing version
    const existing = db
      .prepare(`SELECT version, updated_at FROM user_data WHERE user_id = ?`)
      .get(user.id) as { version: number; updated_at: number } | undefined;

    const newVersion = (existing ? existing.version : 0) + 1;

    db.prepare(
      `INSERT INTO user_data (user_id, folders, bookmarks, settings, version, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET 
         folders = excluded.folders,
         bookmarks = excluded.bookmarks,
         settings = excluded.settings,
         version = excluded.version,
         updated_at = excluded.updated_at`
    ).run(user.id, foldersJson, bookmarksJson, settingsJson, newVersion, now);

    return NextResponse.json({
      success: true,
      version: newVersion,
      updated_at: now,
    });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "上传云端同步数据失败" }, { status: 500 });
  }
}
