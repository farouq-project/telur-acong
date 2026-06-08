import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteProductions } from "@/services/production.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Hanya pemilik yang dapat menghapus data secara massal" }, { status: 403 });
    }

    const body = await request.json();
    const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang dipilih" }, { status: 400 });
    }

    const count = await deleteProductions(ids.map((id) => String(id)));

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("[production/bulk-delete POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
