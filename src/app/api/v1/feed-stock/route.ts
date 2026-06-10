import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFeedStockDaily } from "@/services/feed.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const feedProductId = searchParams.get("feedProductId");
    if (!feedProductId) {
      return NextResponse.json({ error: "feedProductId wajib diisi" }, { status: 400 });
    }

    const data = await getFeedStockDaily({
      feedProductId,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-stock GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
