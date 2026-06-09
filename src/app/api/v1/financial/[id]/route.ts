import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateFinancialNote, deleteFinancialNote } from "@/services/financial.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER" && session.user.role !== "DEVELOPER") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const record = await updateFinancialNote(id, {
      date: body.date,
      type: body.type,
      amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
      description: body.description,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[financial/:id PUT]", error);
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
    if (session.user.role !== "OWNER" && session.user.role !== "DEVELOPER") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const { id } = await params;
    await deleteFinancialNote(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[financial/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
