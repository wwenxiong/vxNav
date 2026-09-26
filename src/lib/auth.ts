import { NextRequest } from "next/server";
import { db, UserRecord } from "./db";

export const SESSION_COOKIE_NAME = "nav_session_token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function getSessionUser(req: NextRequest): UserRecord | null {
  // Extract token from cookie or Authorization header
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const now = Date.now();

  try {
    const row = db
      .prepare(
        `SELECT u.id, u.username, u.created_at, s.expires_at 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.token = ?`
      )
      .get(token) as (UserRecord & { expires_at: number }) | undefined;

    if (!row) {
      return null;
    }

    if (row.expires_at < now) {
      // Session expired, delete it
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      created_at: row.created_at,
    };
  } catch (e) {
    console.error("Failed to query session user:", e);
    return null;
  }
}
