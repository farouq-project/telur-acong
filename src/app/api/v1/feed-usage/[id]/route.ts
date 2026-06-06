import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateFeedUsage, deleteFeedUsage } from "@/services/feed.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const data = await updateFeedUsage(id, {
      date: body.date,
      house: body.house,
      feedProductId: body.feedProductId,
      qtyUsed: body.qtyUsed !== undefined ? parseFloat(body.qtyUsed) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-usage/:id PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteFeedUsage(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[feed-usage/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
