import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getProductions } from "@/services/production.service";
import { getSales } from "@/services/sales.service";
import { getMedicines } from "@/services/medicine.service";
import { getMortalities } from "@/services/mortality.service";
import { getFeedSales } from "@/services/feed.service";
import { formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "OWNER" && session.user.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "production";
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];

    switch (type) {
      case "production": {
        const result = await getProductions({ from, to, limit: 1000 });
        headers = ["Tanggal", "Kandang", "Telur Bagus", "Retak", "BS", "Catatan"];
        data = result.data.map((r) => ({
          Tanggal: formatDate(r.date),
          Kandang: r.house,
          "Telur Bagus": r.goodEggs,
          Retak: r.crackedEggs,
          BS: r.rejectedEggs,
          Catatan: r.notes ?? "",
        }));
        break;
      }
      case "sales": {
        const result = await getSales({ from, to, limit: 1000 });
        headers = ["Tanggal", "Pelanggan", "Jumlah (kg)", "Harga/kg", "Total", "Catatan"];
        data = result.data.map((r) => ({
          Tanggal: formatDate(r.date),
          Pelanggan: r.customerName,
          Jumlah: r.qtySold,
          "Harga Satuan": r.unitPrice,
          Total: r.totalValue,
          Catatan: r.notes ?? "",
        }));
        break;
      }
      case "medicine": {
        const result = await getMedicines({ from, to, limit: 1000 });
        headers = ["Tanggal", "Produk", "Kategori", "Jumlah", "Satuan", "Catatan"];
        data = result.data.map((r) => ({
          Tanggal: formatDate(r.date),
          Produk: r.productName,
          Kategori: r.category === "MEDICINE" ? "Obat" : "Vaksin",
          Jumlah: r.qty,
          Satuan: r.unit,
          Catatan: r.notes ?? "",
        }));
        break;
      }
      case "mortality": {
        const result = await getMortalities({ from, to, limit: 1000 });
        headers = ["Tanggal", "Kandang", "Jumlah Mati", "Catatan"];
        data = result.data.map((r) => ({
          Tanggal: formatDate(r.date),
          Kandang: r.house,
          "Jumlah Mati": r.count,
          Catatan: r.notes ?? "",
        }));
        break;
      }
      case "feed-sales": {
        const records = await getFeedSales({ from, to, limit: 1000 });
        headers = ["Tanggal", "Pelanggan", "Produk", "Jumlah", "Harga", "Total"];
        data = records.map((r) => ({
          Tanggal: formatDate(r.date),
          Pelanggan: r.customerName,
          Produk: (r.feedProduct as { name: string })?.name ?? "",
          Jumlah: r.qty,
          Harga: r.unitPrice,
          Total: r.totalValue,
        }));
        break;
      }
      default:
        return NextResponse.json({ error: "Tipe laporan tidak valid" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data, headers });
  } catch (error) {
    console.error("[reports GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
