import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateMortality, deleteMortality } from "@/services/mortality.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const record = await updateMortality(id, {
      date: body.date,
      house: body.house,
      count: body.count !== undefined ? parseInt(body.count) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[mortality/:id PUT]", error);
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
    await deleteMortality(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[mortality/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
