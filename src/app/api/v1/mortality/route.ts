import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMortalities, createMortality } from "@/services/mortality.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const result = await getMortalities({
      search: searchParams.get("search") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[mortality GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.date || !body.house || !body.count) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const record = await createMortality({
      date: body.date,
      house: body.house,
      count: parseInt(body.count),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[mortality POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
