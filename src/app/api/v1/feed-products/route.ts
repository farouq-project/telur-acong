import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getFeedProducts,
  createFeedProduct,
} from "@/services/feed.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getFeedProducts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[feed-products GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 });
    }

    const data = await createFeedProduct({
      name: body.name,
      unit: body.unit ?? "kg",
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[feed-products POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
