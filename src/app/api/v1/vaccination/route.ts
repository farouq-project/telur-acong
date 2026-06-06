import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getVaccinationSchedules,
  createVaccination,
} from "@/services/vaccination.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "true";
    const data = await getVaccinationSchedules({ includeDone });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[vaccination GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.vaccineName || !body.scheduleDate) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = await createVaccination({
      vaccineName: body.vaccineName,
      scheduleDate: body.scheduleDate,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("[vaccination POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
