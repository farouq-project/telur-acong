import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  updateVaccination,
  deleteVaccination,
} from "@/services/vaccination.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const data = await updateVaccination(id, {
      vaccineName: body.vaccineName,
      scheduleDate: body.scheduleDate,
      notes: body.notes,
      isDone: body.isDone,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[vaccination/:id PUT]", error);
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
    await deleteVaccination(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[vaccination/:id DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
