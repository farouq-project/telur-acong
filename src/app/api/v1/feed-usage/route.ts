import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFeedUsages, createFeedUsage } from "@/services/feed.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const data = await getFeedUsages({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-usage GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.date || !body.house || !body.feedProductId || !body.qtyUsed) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = await createFeedUsage({
      date: body.date,
      house: body.house,
      feedProductId: body.feedProductId,
      qtyUsed: parseFloat(body.qtyUsed),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[feed-usage POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
