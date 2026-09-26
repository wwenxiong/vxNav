import { NextRequest, NextResponse } from "next/server";
import { db, verifyPassword, generateSessionToken } from "@/lib/db";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "请输入用户名和密码" },
        { status: 400 }
      );
    }

    const row = db
      .prepare(
        `SELECT id, username, password_hash, salt, created_at 
         FROM users 
         WHERE username = ? COLLATE NOCASE`
      )
      .get(username) as
      | { id: string; username: string; password_hash: string; salt: string; created_at: number }
      | undefined;

    if (!row) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, row.salt, row.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const now = Date.now();
    const token = generateSessionToken();
    const expiresAt = now + SESSION_MAX_AGE * 1000;

    db.prepare(
      `INSERT INTO sessions (token, user_id, created_at, expires_at) 
       VALUES (?, ?, ?, ?)`
    ).run(token, row.id, now, expiresAt);

    const res = NextResponse.json({
      success: true,
      user: {
        id: row.id,
        username: row.username,
        created_at: row.created_at,
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
