import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import { updateBusinessSettings } from "@/services/business-settings.service";
import { getCachedBusinessSettings } from "@/lib/cache";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getCachedBusinessSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[business-settings GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER" && session.user.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const body = await request.json();
    const data = await updateBusinessSettings({
      companyName: body.companyName || null,
      slogan: body.slogan || null,
      address: body.address || null,
      logoUrl: body.logoUrl || null,
      bankName: body.bankName || null,
      bankAccountNumber: body.bankAccountNumber || null,
      bankAccountHolder: body.bankAccountHolder || null,
    });
    revalidateTag("business-settings", { expire: 0 });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[business-settings PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
