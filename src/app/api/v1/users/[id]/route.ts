import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateUser, resetPassword } from "@/services/user.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Hanya developer yang dapat mengelola pengguna" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = await updateUser(id, {
      name: body.name,
      email: body.email,
      role: body.role,
      isActive: body.isActive,
      companyName: body.companyName ?? null,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Hanya developer yang dapat mengelola pengguna" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.action === "resetPassword" && body.newPassword) {
      await resetPassword(id, body.newPassword);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("[users/:id PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
