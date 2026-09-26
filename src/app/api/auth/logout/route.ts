import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (token) {
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    }

    const res = NextResponse.json({ success: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true });
  }
}
