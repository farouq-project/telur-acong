"use client";

import { TrendChart } from "@/components/dashboard/TrendChart";
import { DailyMetricsTable } from "@/components/dashboard/DailyMetricsTable";
import type { DailyMetric } from "@/types";

interface Props {
  productionTrend: { date: string; value: number }[];
  salesTrend: { date: string; value: number }[];
  mortalityTrend: { date: string; value: number }[];
  dailyMetrics: DailyMetric[];
}

export function DashboardCharts({ productionTrend, salesTrend, mortalityTrend, dailyMetrics }: Props) {
  return (
    <>
      <TrendChart title="Tren Produksi (30 Hari)" data={productionTrend} color="#16a34a" unit="butir" />
      <TrendChart title="Tren Penjualan (30 Hari)" data={salesTrend} color="#7c3aed" unit="kg" />
      <TrendChart title="Tren Kematian (30 Hari)" data={mortalityTrend} color="#ef4444" unit="ekor" />
      <DailyMetricsTable
        title="FCR, HD & Feed Intake per Hari per Kandang (14 Hari)"
        data={dailyMetrics}
      />
    </>
  );
}
