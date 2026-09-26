import { NextRequest, NextResponse } from "next/server";
import { db, hashPassword, generateSessionToken } from "@/lib/db";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";
import { stripEmojis } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || "").trim();
    const password = body.password || "";
    const initialData = body.initialData; // optional local bookmarks to migrate

    if (!username || username.length < 2 || username.length > 30) {
      return NextResponse.json(
        { error: "用户名长度需在 2 到 30 个字符之间" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "密码长度不能少于 6 位" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = db
      .prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`)
      .get(username);

    if (existing) {
      return NextResponse.json(
        { error: "该用户名已被注册，请尝试直接登录或更换用户名" },
        { status: 409 }
      );
    }

    const userId = "u-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    const { salt, hash } = hashPassword(password);
    const now = Date.now();

    // Create user
    db.prepare(
      `INSERT INTO users (id, username, password_hash, salt, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, username, hash, salt, now, now);

    // Initial user data
    const foldersJson = initialData?.folders ? JSON.stringify(initialData.folders) : "[]";
    const bookmarksJson = initialData?.bookmarks ? JSON.stringify(initialData.bookmarks) : "[]";
    const settingsJson = initialData?.settings ? JSON.stringify(initialData.settings) : "{}";

    db.prepare(
      `INSERT INTO user_data (user_id, folders, bookmarks, settings, version, updated_at) 
       VALUES (?, ?, ?, ?, 1, ?)`
    ).run(userId, foldersJson, bookmarksJson, settingsJson, now);

    // Create session token
    const token = generateSessionToken();
    const expiresAt = now + SESSION_MAX_AGE * 1000;
    db.prepare(
      `INSERT INTO sessions (token, user_id, created_at, expires_at) 
       VALUES (?, ?, ?, ?)`
    ).run(token, userId, now, expiresAt);

    const res = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username,
        created_at: now,
      },
      token,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
