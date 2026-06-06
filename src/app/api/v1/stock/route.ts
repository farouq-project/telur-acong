import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEggStock, getFeedStock } from "@/services/stock.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [eggStock, feedStocks] = await Promise.all([
      getEggStock(),
      getFeedStock(),
    ]);

    return NextResponse.json(
      { success: true, data: { eggStock, feedStocks } },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("[stock GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
