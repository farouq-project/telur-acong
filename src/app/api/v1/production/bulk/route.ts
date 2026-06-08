import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { bulkCreateProductions, type CreateProductionInput } from "@/services/production.service";

// Impor besar terhadap database remote bisa memakan waktu lebih dari batas default —
// klien sudah memecah baris jadi beberapa request, ini hanya margin keamanan tambahan.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rows: unknown[] = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diimpor" }, { status: 400 });
    }
    if (rows.length > 1000) {
      return NextResponse.json({ error: "Maksimal 1000 baris per impor" }, { status: 400 });
    }

    const inputs: CreateProductionInput[] = rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        date: String(row.date),
        house: String(row.house),
        populasi: row.populasi != null ? Number(row.populasi) : undefined,
        goodEggs: Number(row.goodEggs ?? 0),
        crackedEggs: Number(row.crackedEggs ?? 0),
        rejectedEggs: 0,
        goodEggsKg: row.goodEggsKg != null ? Number(row.goodEggsKg) : undefined,
        crackedEggsKg: row.crackedEggsKg != null ? Number(row.crackedEggsKg) : undefined,
        feedQtyKg: row.feedQtyKg != null ? Number(row.feedQtyKg) : undefined,
        feedProductId: row.feedProductId != null && row.feedProductId !== "" ? String(row.feedProductId) : undefined,
        mortality: row.mortality != null ? Number(row.mortality) : undefined,
        notes: row.notes != null && row.notes !== "" ? String(row.notes) : undefined,
      };
    });

    const count = await bulkCreateProductions(inputs);

    return NextResponse.json({ success: true, count }, { status: 201 });
  } catch (error) {
    console.error("[production/bulk POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
