import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateFeedSale, deleteFeedSale } from "@/services/feed.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const data = await updateFeedSale(id, {
      date: body.date,
      customerName: body.customerName,
      feedProductId: body.feedProductId,
      qty: body.qty !== undefined ? parseFloat(body.qty) : undefined,
      unitPrice: body.unitPrice !== undefined ? parseFloat(body.unitPrice) : undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-sales/:id PUT]", error);
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
    await deleteFeedSale(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[feed-sales/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
