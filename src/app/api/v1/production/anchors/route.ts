import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProductionAnchors } from "@/services/production.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getProductionAnchors();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[production/anchors GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
