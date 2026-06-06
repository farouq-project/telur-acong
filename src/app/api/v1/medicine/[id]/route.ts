import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateMedicine, deleteMedicine } from "@/services/medicine.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const record = await updateMedicine(id, {
      date: body.date,
      productName: body.productName,
      category: body.category,
      qty: body.qty !== undefined ? parseFloat(body.qty) : undefined,
      unit: body.unit,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[medicine/:id PUT]", error);
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

    const { id } = await params;
    await deleteMedicine(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[medicine/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
