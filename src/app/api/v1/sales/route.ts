import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSales, createSale } from "@/services/sales.service";
import { getEggStock } from "@/services/stock.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const result = await getSales({
      search: searchParams.get("search") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
      offset: parseInt(searchParams.get("offset") ?? "0"),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[sales GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { date, customerName, qtySold, unitPrice, notes } = body;

    if (!date || !customerName || !qtySold || !unitPrice) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const currentStock = await getEggStock();
    if (parseInt(qtySold) > currentStock) {
      return NextResponse.json(
        { error: `Stok telur tidak cukup. Stok saat ini: ${currentStock} butir` },
        { status: 422 }
      );
    }

    const record = await createSale({
      date,
      customerName,
      qtySold: parseInt(qtySold),
      unitPrice: parseFloat(unitPrice),
      notes,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[sales POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
