import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMedicines, createMedicine } from "@/services/medicine.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const result = await getMedicines({
      search: searchParams.get("search") ?? undefined,
      category:
        categoryParam === "MEDICINE" || categoryParam === "VACCINE"
          ? categoryParam
          : undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[medicine GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { date, productName, category, qty, unit, notes } = body;

    if (!date || !productName || !category || !qty) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const record = await createMedicine({
      date,
      productName,
      category,
      qty: parseFloat(qty),
      unit: unit ?? "botol",
      notes,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[medicine POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
