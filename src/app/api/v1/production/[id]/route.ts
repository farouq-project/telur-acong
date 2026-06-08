import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProductionById, updateProduction, deleteProduction } from "@/services/production.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const record = await getProductionById(id);
    if (!record) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[production/:id GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const record = await updateProduction(id, {
      date: body.date,
      house: body.house,
      populasi: body.populasi != null ? parseInt(body.populasi) : undefined,
      goodEggs: body.goodEggs !== undefined ? parseInt(body.goodEggs) : undefined,
      crackedEggs: body.crackedEggs !== undefined ? parseInt(body.crackedEggs) : undefined,
      rejectedEggs: body.rejectedEggs !== undefined ? parseInt(body.rejectedEggs) : undefined,
      goodEggsKg: body.goodEggsKg != null ? parseFloat(body.goodEggsKg) : undefined,
      crackedEggsKg: body.crackedEggsKg != null ? parseFloat(body.crackedEggsKg) : undefined,
      rejectedEggsKg: body.rejectedEggsKg != null ? parseFloat(body.rejectedEggsKg) : undefined,
      feedQtyKg: body.feedQtyKg != null ? parseFloat(body.feedQtyKg) : undefined,
      feedProductId: body.feedProductId !== undefined ? (body.feedProductId || null) : undefined,
      mortality: body.mortality != null ? parseInt(body.mortality) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[production/:id PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    await deleteProduction(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[production/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
