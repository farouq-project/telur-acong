import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFeedStockOpnames, upsertFeedStockOpname } from "@/services/feed.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const data = await getFeedStockOpnames({
      feedProductId: searchParams.get("feedProductId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-stock-opname GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.date || !body.feedProductId || body.qtyKg == null) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = await upsertFeedStockOpname({
      date: body.date,
      feedProductId: body.feedProductId,
      qtyKg: parseFloat(body.qtyKg),
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[feed-stock-opname POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
