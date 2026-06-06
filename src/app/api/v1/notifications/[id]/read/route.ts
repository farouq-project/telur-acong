import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { markAsRead } from "@/services/notification.service";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await markAsRead(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications/:id/read PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
