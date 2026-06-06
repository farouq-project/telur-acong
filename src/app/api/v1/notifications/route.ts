import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getNotifications,
  markAllAsRead,
} from "@/services/notification.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const data = await getNotifications(session.user.id, {
      unreadOnly,
      limit: 50,
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("[notifications GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (body.action === "markAllRead") {
      await markAllAsRead(session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("[notifications PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
