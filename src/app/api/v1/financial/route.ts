import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFinancialNotes, getFinancialSummary, createFinancialNote } from "@/services/financial.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER" && session.user.role !== "DEVELOPER") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const [result, summary] = await Promise.all([
      getFinancialNotes({ from, to, limit: parseInt(searchParams.get("limit") ?? "100") }),
      getFinancialSummary({ from, to }),
    ]);

    return NextResponse.json({ success: true, ...result, summary });
  } catch (error) {
    console.error("[financial GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER" && session.user.role !== "DEVELOPER") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const body = await request.json();
    const { date, type, amount, description } = body;

    if (!date || !type || !amount || !description) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
    }

    const record = await createFinancialNote({
      date,
      type,
      amount: parseFloat(amount),
      description,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[financial POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
