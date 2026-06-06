import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFeedSales, createFeedSale } from "@/services/feed.service";
import { getFeedStockByProduct } from "@/services/stock.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const data = await getFeedSales({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-sales GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { date, customerName, feedProductId, qty, unitPrice } = body;

    if (!date || !customerName || !feedProductId || !qty || !unitPrice) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const currentStock = await getFeedStockByProduct(feedProductId);
    if (parseFloat(qty) > currentStock) {
      return NextResponse.json(
        { error: `Stok pakan tidak cukup. Stok saat ini: ${currentStock}` },
        { status: 422 }
      );
    }

    const data = await createFeedSale({
      date,
      customerName,
      feedProductId,
      qty: parseFloat(qty),
      unitPrice: parseFloat(unitPrice),
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[feed-sales POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
