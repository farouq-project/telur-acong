"use client";

import { TrendChart } from "@/components/dashboard/TrendChart";

interface Props {
  productionTrend: { date: string; value: number }[];
  salesTrend: { date: string; value: number }[];
  mortalityTrend: { date: string; value: number }[];
}

export function DashboardCharts({ productionTrend, salesTrend, mortalityTrend }: Props) {
  return (
    <>
      <TrendChart title="Tren Produksi (30 Hari)" data={productionTrend} color="#16a34a" unit="butir" />
      <TrendChart title="Tren Penjualan (30 Hari)" data={salesTrend} color="#7c3aed" unit="butir" />
      <TrendChart title="Tren Kematian (30 Hari)" data={mortalityTrend} color="#ef4444" unit="ekor" />
    </>
  );
}
