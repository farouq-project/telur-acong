import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCachedDashboardStats } from "@/lib/cache";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RefreshButton } from "@/components/layout/RefreshButton";
import { DashboardCharts } from "./DashboardCharts";
import { HouseReportCard } from "./HouseReportCard";
import { CalendarCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const [session, stats] = await Promise.all([
    getServerSession(authOptions),
    getCachedDashboardStats({ from, to }),
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
        <HouseReportCard
          houseReport={stats.houseReport}
          jualBagusKg={stats.jualBagusKg}
          jualRetakKg={stats.jualRetakKg}
          stokTelurBagus={stats.stokTelurBagus}
          stokTelurRetak={stats.stokTelurRetak}
          from={from}
          to={to}
        />

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
