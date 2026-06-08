"use client";

import { useMemo, useState } from "react";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { DailyMetricsTable } from "@/components/dashboard/DailyMetricsTable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListFilter, ArrowUpDown } from "lucide-react";
import { format, startOfWeek, startOfMonth, parseISO } from "date-fns";
import type { DailyMetric } from "@/types";

type Period = "daily" | "weekly" | "monthly";

interface ProductionPoint {
  date: string;
  house: string;
  value: number;
}

interface Props {
  productionByHouse: ProductionPoint[];
  salesTrend: { date: string; value: number }[];
  mortalityTrend: { date: string; value: number }[];
  dailyMetrics: DailyMetric[];
  houses: string[];
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

function bucketKey(dateIso: string, period: Period) {
  const d = parseISO(dateIso);
  if (period === "weekly") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  if (period === "monthly") return format(startOfMonth(d), "yyyy-MM-01");
  return dateIso.split("T")[0];
}

function average(values: (number | null)[]) {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 100000) / 100000;
}

function byDate(sortDir: "asc" | "desc") {
  return (a: { date: string }, b: { date: string }) =>
    sortDir === "asc"
      ? new Date(a.date).getTime() - new Date(b.date).getTime()
      : new Date(b.date).getTime() - new Date(a.date).getTime();
}

export function DashboardCharts({ productionByHouse, salesTrend, mortalityTrend, dailyMetrics, houses }: Props) {
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("daily");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleHouse(name: string) {
    setSelectedHouses((prev) => (prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name]));
  }

  const filteredMetrics = useMemo<DailyMetric[]>(() => {
    const filtered = selectedHouses.length > 0
      ? dailyMetrics.filter((d) => selectedHouses.includes(d.house))
      : dailyMetrics;

    if (period === "daily") {
      return [...filtered].sort(byDate(sortDir));
    }

    const groups = new Map<
      string,
      { date: string; house: string; fcr: (number | null)[]; hd: (number | null)[]; feedIntake: (number | null)[] }
    >();
    filtered.forEach((d) => {
      const bucket = bucketKey(d.date, period);
      const key = `${bucket}__${d.house}`;
      if (!groups.has(key)) {
        groups.set(key, { date: bucket, house: d.house, fcr: [], hd: [], feedIntake: [] });
      }
      const g = groups.get(key)!;
      g.fcr.push(d.fcr);
      g.hd.push(d.hd);
      g.feedIntake.push(d.feedIntake);
    });

    return Array.from(groups.entries())
      .map(([key, g]) => ({
        id: key,
        date: g.date,
        house: g.house,
        fcr: average(g.fcr),
        hd: average(g.hd),
        feedIntake: average(g.feedIntake),
      }))
      .sort(byDate(sortDir));
  }, [dailyMetrics, selectedHouses, period, sortDir]);

  const filteredProductionTrend = useMemo(() => {
    const filtered = selectedHouses.length > 0
      ? productionByHouse.filter((p) => selectedHouses.includes(p.house))
      : productionByHouse;

    const totals = new Map<string, number>();
    filtered.forEach((p) => {
      const bucket = bucketKey(p.date, period);
      totals.set(bucket, (totals.get(bucket) ?? 0) + p.value);
    });

    return Array.from(totals.entries())
      .map(([date, value]) => ({ date, value }))
      .sort(byDate("asc"));
  }, [productionByHouse, selectedHouses, period]);

  const periodLabel = PERIOD_LABELS[period];
  const houseFilterLabel = selectedHouses.length === 0
    ? "Semua Kandang"
    : selectedHouses.length === 1
      ? selectedHouses[0]
      : `${selectedHouses.length} Kandang`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <ListFilter className="w-3.5 h-3.5" />
              {houseFilterLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter Kandang</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {houses.map((h) => (
              <DropdownMenuCheckboxItem
                key={h}
                checked={selectedHouses.includes(h)}
                onCheckedChange={() => toggleHouse(h)}
                onSelect={(e) => e.preventDefault()}
              >
                {h}
              </DropdownMenuCheckboxItem>
            ))}
            {selectedHouses.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSelectedHouses([])}>Reset filter kandang</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-9 w-[112px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Harian</SelectItem>
            <SelectItem value="weekly">Mingguan</SelectItem>
            <SelectItem value="monthly">Bulanan</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortDir === "asc" ? "Terlama" : "Terbaru"}
        </Button>
      </div>

      <DailyMetricsTable
        title={`FCR, HD & Feed Intake per Kandang (${periodLabel})`}
        data={filteredMetrics}
      />
      <TrendChart title={`Tren Produksi (${periodLabel})`} data={filteredProductionTrend} color="#16a34a" unit="butir" />
      <TrendChart title="Tren Penjualan (30 Hari)" data={salesTrend} color="#7c3aed" unit="kg" />
      <TrendChart title="Tren Kematian (30 Hari)" data={mortalityTrend} color="#ef4444" unit="ekor" />
    </>
  );
}
