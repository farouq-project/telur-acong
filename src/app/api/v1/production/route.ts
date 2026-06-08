import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProductions, createProduction } from "@/services/production.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const housesParam = searchParams.get("houses");
    const result = await getProductions({
      search: searchParams.get("search") ?? undefined,
      houses: housesParam ? housesParam.split(",").map((h) => h.trim()).filter(Boolean) : undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
      offset: parseInt(searchParams.get("offset") ?? "0"),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[production GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { date, house, populasi, goodEggs, crackedEggs, rejectedEggs,
            goodEggsKg, crackedEggsKg, rejectedEggsKg, feedQtyKg, feedProductId, mortality, notes } = body;

    if (!date || !house || goodEggs === undefined) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const record = await createProduction({
      date,
      house,
      populasi: populasi != null ? parseInt(populasi) : undefined,
      goodEggs: parseInt(goodEggs),
      crackedEggs: parseInt(crackedEggs ?? 0),
      rejectedEggs: parseInt(rejectedEggs ?? 0),
      goodEggsKg: goodEggsKg != null ? parseFloat(goodEggsKg) : undefined,
      crackedEggsKg: crackedEggsKg != null ? parseFloat(crackedEggsKg) : undefined,
      rejectedEggsKg: rejectedEggsKg != null ? parseFloat(rejectedEggsKg) : undefined,
      feedQtyKg: feedQtyKg != null ? parseFloat(feedQtyKg) : undefined,
      feedProductId: feedProductId != null && feedProductId !== "" ? String(feedProductId) : undefined,
      mortality: mortality != null ? parseInt(mortality) : undefined,
      notes,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[production POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
