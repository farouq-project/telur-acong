import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFeedPurchases, createFeedPurchase } from "@/services/feed.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const data = await getFeedPurchases({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-purchases GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.date || !body.feedProductId || !body.qty) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = await createFeedPurchase({
      date: body.date,
      feedProductId: body.feedProductId,
      qty: parseFloat(body.qty),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[feed-purchases POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
