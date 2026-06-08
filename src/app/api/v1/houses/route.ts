import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHouses, createHouse } from "@/services/house.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getHouses();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[houses GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Nama kandang wajib diisi" }, { status: 400 });
    }

    const data = await createHouse({
      name: body.name,
      currentPopulation: body.currentPopulation != null ? parseInt(body.currentPopulation) : 0,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Nama kandang sudah digunakan" }, { status: 409 });
    }
    console.error("[houses POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
