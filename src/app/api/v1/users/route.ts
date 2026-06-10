import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUsers, createUser } from "@/services/user.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role;
    if (role !== "OWNER" && role !== "DEVELOPER") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const data = await getUsers(role === "DEVELOPER");
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[users GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Hanya developer yang dapat mengelola pengguna" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, companyName, notes, logoUrl } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = await createUser({
      name,
      email,
      password,
      role: role ?? "STAFF",
      companyName: companyName || undefined,
      notes: notes || undefined,
      logoUrl: logoUrl || null,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
