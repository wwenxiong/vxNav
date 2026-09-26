import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get session user error:", error);
    return NextResponse.json({ user: null });
  }
}
