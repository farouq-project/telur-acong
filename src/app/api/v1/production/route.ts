import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getProductions,
  createProduction,
} from "@/services/production.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const result = await getProductions({
      search: searchParams.get("search") ?? undefined,
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
    const { date, house, goodEggs, crackedEggs, rejectedEggs, notes } = body;

    if (!date || !house || goodEggs === undefined) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const record = await createProduction({
      date,
      house,
      goodEggs: parseInt(goodEggs),
      crackedEggs: parseInt(crackedEggs ?? 0),
      rejectedEggs: parseInt(rejectedEggs ?? 0),
      notes,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[production POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
