import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCachedDashboardStats } from "@/lib/cache";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RefreshButton } from "@/components/layout/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "./DashboardCharts";
import { CalendarCheck, ClipboardList } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([
    getServerSession(authOptions),
    getCachedDashboardStats(),
  ]);

  const isOwner = (session?.user?.role === "OWNER" || session?.user?.role === "DEVELOPER");

  return (
    <>
      <MobileHeader title="Beranda" />
      <div className="px-4 py-4 space-y-4">

        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Selamat datang,</p>
            <p className="font-semibold text-gray-800">{session?.user?.name}</p>
          </div>
          <RefreshButton />
        </div>

        {/* Upcoming vaccination alert */}
        {stats.upcomingVaccinations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <CalendarCheck className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Vaksin Mendekat</p>
              {stats.upcomingVaccinations.map((v) => (
                <p key={v.id} className="text-xs text-amber-700 mt-0.5">
                  {v.vaccineName} — {formatDate(v.scheduleDate)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Per-kandang report */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-green-600" />
              Laporan Produksi & Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left font-medium px-2 py-1.5">Kandang</th>
                  <th className="text-right font-medium px-2 py-1.5">Populasi</th>
                  <th className="text-right font-medium px-2 py-1.5">Mati</th>
                  <th className="text-right font-medium px-2 py-1.5">Pakan (kg)</th>
                  <th className="text-right font-medium px-2 py-1.5">Telur Bagus (kg)</th>
                  <th className="text-right font-medium px-2 py-1.5">Telur Retak (kg)</th>
                  <th className="text-right font-medium px-2 py-1.5">Jual Bagus (kg)</th>
                  <th className="text-right font-medium px-2 py-1.5">Jual Retak (kg)</th>
                  <th className="text-right font-medium px-2 py-1.5">Stok Bagus (kg)</th>
                  <th className="text-right font-medium px-2 py-1.5">Stok Retak (kg)</th>
                </tr>
              </thead>
              <tbody>
                {stats.houseReport.map((h) => (
                  <tr key={h.house} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5 font-medium text-gray-800">{h.house}</td>
                    <td className="px-2 py-1.5 text-right">{h.populasi != null ? formatNumber(h.populasi) : "-"}</td>
                    <td className="px-2 py-1.5 text-right">{formatNumber(h.mati)}</td>
                    <td className="px-2 py-1.5 text-right">{formatNumber(h.pakanKg)}</td>
                    <td className="px-2 py-1.5 text-right">{formatNumber(h.telurBagusKg)}</td>
                    <td className="px-2 py-1.5 text-right">{formatNumber(h.telurRetakKg)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">-</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">-</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">-</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">-</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold text-gray-800">
                  <td className="px-2 py-1.5">Total</td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(stats.houseReport.reduce((sum, h) => sum + (h.populasi ?? 0), 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(stats.houseReport.reduce((sum, h) => sum + h.mati, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(stats.houseReport.reduce((sum, h) => sum + h.pakanKg, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(stats.houseReport.reduce((sum, h) => sum + h.telurBagusKg, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(stats.houseReport.reduce((sum, h) => sum + h.telurRetakKg, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(stats.jualBagusKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(stats.jualRetakKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(stats.stokTelurBagus)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(stats.stokTelurRetak)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Charts — client component, owner only */}
        {isOwner && (
          <DashboardCharts
            productionByHouse={stats.productionByHouse}
            salesTrend={stats.salesTrend}
            mortalityTrend={stats.mortalityTrend}
            dailyMetrics={stats.dailyMetrics}
            houses={stats.houseNames}
          />
        )}

        <div className="h-4" />
      </div>
    </>
  );
}
