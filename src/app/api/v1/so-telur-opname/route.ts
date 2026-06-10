import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { upsertEggStockOpname } from "@/services/production.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.date || body.telurBagusKg == null || body.telurRetakKg == null || body.telurBuleKg == null) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = await upsertEggStockOpname({
      date: body.date,
      telurBagusKg: parseFloat(body.telurBagusKg),
      telurRetakKg: parseFloat(body.telurRetakKg),
      telurBuleKg: parseFloat(body.telurBuleKg),
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[so-telur-opname POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
