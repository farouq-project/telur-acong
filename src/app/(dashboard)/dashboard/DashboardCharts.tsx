"use client";

import { TrendChart } from "@/components/dashboard/TrendChart";
import { HouseBarChart } from "@/components/dashboard/HouseBarChart";
import type { HouseMetric } from "@/types";

interface Props {
  productionTrend: { date: string; value: number }[];
  salesTrend: { date: string; value: number }[];
  mortalityTrend: { date: string; value: number }[];
  houseMetrics: HouseMetric[];
}

export function DashboardCharts({ productionTrend, salesTrend, mortalityTrend, houseMetrics }: Props) {
  return (
    <>
      <TrendChart title="Tren Produksi (30 Hari)" data={productionTrend} color="#16a34a" unit="butir" />
      <TrendChart title="Tren Penjualan (30 Hari)" data={salesTrend} color="#7c3aed" unit="kg" />
      <TrendChart title="Tren Kematian (30 Hari)" data={mortalityTrend} color="#ef4444" unit="ekor" />
      <HouseBarChart
        title="Feed Intake per Kandang (30 Hari)"
        data={houseMetrics}
        dataKey="feedIntake"
        color="#f59e0b"
        unit="kg/ekor"
      />
      <HouseBarChart
        title="FCR per Kandang (30 Hari)"
        data={houseMetrics}
        dataKey="fcr"
        color="#8b5cf6"
        unit="%"
      />
    </>
  );
}
