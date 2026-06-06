import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCachedDashboardStats } from "@/lib/cache";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RefreshButton } from "@/components/layout/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardCharts } from "./DashboardCharts";
import {
  Egg,
  TrendingUp,
  ShoppingCart,
  Skull,
  Wheat,
  CalendarCheck,
} from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([
    getServerSession(authOptions),
    getCachedDashboardStats(),
  ]);

  const isOwner = session?.user?.role === "OWNER";

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

        {/* Primary stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Egg className="w-5 h-5 text-white" />}
            color="bg-green-600"
            label="Stok Telur"
            value={formatNumber(stats.eggStock)}
            unit="butir"
            highlight
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            color="bg-blue-500"
            label="Produksi Hari Ini"
            value={formatNumber(stats.todayProduction)}
            unit="butir"
          />
          <StatCard
            icon={<ShoppingCart className="w-5 h-5 text-white" />}
            color="bg-purple-500"
            label="Penjualan Hari Ini"
            value={formatNumber(stats.todaySales)}
            unit="butir"
          />
          <StatCard
            icon={<Skull className="w-5 h-5 text-white" />}
            color="bg-red-400"
            label="Kematian Hari Ini"
            value={formatNumber(stats.todayMortality)}
            unit="ekor"
          />
        </div>

        {/* Feed stock */}
        {stats.feedStocks.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wheat className="w-4 h-4 text-green-600" />
                Stok Pakan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {stats.feedStocks.map((feed) => (
                  <div key={feed.productId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{feed.productName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {formatNumber(feed.stock)}
                      </span>
                      <span className="text-xs text-gray-400">{feed.unit}</span>
                      {feed.stock < 100 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          Rendah
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly stats — owner only */}
        {isOwner && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-gray-500">Produksi Bulan Ini</p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {formatNumber(stats.monthlyProduction)}
                <span className="text-xs font-normal text-gray-400 ml-1">butir</span>
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-500">Kematian Bulan Ini</p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {formatNumber(stats.monthlyMortality)}
                <span className="text-xs font-normal text-gray-400 ml-1">ekor</span>
              </p>
            </Card>
          </div>
        )}

        {/* Charts — client component, owner only */}
        {isOwner && (
          <DashboardCharts
            productionTrend={stats.productionTrend}
            salesTrend={stats.salesTrend}
            mortalityTrend={stats.mortalityTrend}
          />
        )}

        <div className="h-4" />
      </div>
    </>
  );
}

function StatCard({
  icon, color, label, value, unit, highlight,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-green-200 bg-green-50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">{label}</p>
            <p className={`font-bold ${highlight ? "text-green-700 text-xl" : "text-gray-800 text-lg"}`}>
              {value}
              <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
