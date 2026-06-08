import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateFeedPurchase, deleteFeedPurchase } from "@/services/feed.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const data = await updateFeedPurchase(id, {
      date: body.date,
      feedProductId: body.feedProductId,
      qty: body.qty !== undefined ? parseFloat(body.qty) : undefined,
      pricePerKg: body.pricePerKg !== undefined ? (body.pricePerKg !== "" ? parseFloat(body.pricePerKg) : null) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-purchases/:id PUT]", error);
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
    await deleteFeedPurchase(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[feed-purchases/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
