import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSaleById, updateSale, deleteSale } from "@/services/sales.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const record = await getSaleById(id);
    if (!record) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[sales/:id GET]", error);
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
    const record = await updateSale(id, {
      date: body.date,
      customerName: body.customerName,
      qtySold: body.qtySold !== undefined ? parseInt(body.qtySold) : undefined,
      unitPrice:
        body.unitPrice !== undefined ? parseFloat(body.unitPrice) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[sales/:id PUT]", error);
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
    await deleteSale(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sales/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
