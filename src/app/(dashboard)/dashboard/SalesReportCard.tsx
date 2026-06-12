"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNumber, formatRupiah, todayISO } from "@/lib/utils";
import type { CustomerSalesReport } from "@/services/sales.service";

type SortCol = "customerName" | "telurBagusKg" | "telurRetakKg" | "telurBuleKg" | "totalJual";

const COLS: { key: SortCol; label: string; align?: "right" }[] = [
  { key: "customerName", label: "Pelanggan" },
  { key: "telurBagusKg", label: "Total Telur Bagus", align: "right" },
  { key: "telurRetakKg", label: "Total Telur Retak", align: "right" },
  { key: "telurBuleKg", label: "Total Telur Bule", align: "right" },
  { key: "totalJual", label: "Total Jual (Rp)", align: "right" },
];

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-green-600 ml-0.5 inline-block" />
    : <ArrowDown className="w-3 h-3 text-green-600 ml-0.5 inline-block" />;
}

function weekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

export function SalesReportCard({
  salesReport, from, to,
}: {
  salesReport: CustomerSalesReport[];
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const [sortCol, setSortCol] = useState<SortCol>("customerName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [fromInput, setFromInput] = useState(from ?? "");
  const [toInput, setToInput] = useState(to ?? "");

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function applyRange(newFrom?: string, newTo?: string) {
    const params = new URLSearchParams(window.location.search);
    if (newFrom) params.set("salesFrom", newFrom); else params.delete("salesFrom");
    if (newTo) params.set("salesTo", newTo); else params.delete("salesTo");
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  }

  function setToday() {
    const d = todayISO();
    setFromInput(d);
    setToInput(d);
    applyRange(d, d);
  }

  function setThisWeek() {
    const { from: f, to: t } = weekRange();
    setFromInput(f);
    setToInput(t);
    applyRange(f, t);
  }

  function setThisMonth() {
    const { from: f, to: t } = monthRange();
    setFromInput(f);
    setToInput(t);
    applyRange(f, t);
  }

  function setAll() {
    setFromInput("");
    setToInput("");
    applyRange();
  }

  const sorted = useMemo(() => {
    const arr = [...salesReport];
    arr.sort((a, b) => {
      if (sortCol === "customerName") {
        return sortDir === "asc" ? a.customerName.localeCompare(b.customerName) : b.customerName.localeCompare(a.customerName);
      }
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [salesReport, sortCol, sortDir]);

  const thBase = "font-medium px-2 py-1.5 select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap";
  const presetBtn = "px-2.5 h-8 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50";
  const presetBtnActive = "px-2.5 h-8 rounded-lg text-xs font-medium border border-green-600 bg-green-600 text-white";

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="w-4 h-4 text-green-600" />
          Laporan Penjualan
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-2 pb-3 text-xs">
          <button onClick={setToday} className={(from === todayISO() && to === todayISO()) ? presetBtnActive : presetBtn}>
            Hari Ini
          </button>
          <button onClick={setThisWeek} className={(() => { const w = weekRange(); return from === w.from && to === w.to ? presetBtnActive : presetBtn; })()}>
            Minggu Ini
          </button>
          <button onClick={setThisMonth} className={(() => { const m = monthRange(); return from === m.from && to === m.to ? presetBtnActive : presetBtn; })()}>
            Bulan Ini
          </button>
          <button onClick={setAll} className={!from && !to ? presetBtnActive : presetBtn}>
            Semua
          </button>
          <Input
            type="date"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="h-8 w-[130px] text-xs px-2"
          />
          <span className="text-gray-400">–</span>
          <Input
            type="date"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className="h-8 w-[130px] text-xs px-2"
          />
          <button
            onClick={() => applyRange(fromInput || undefined, toInput || undefined)}
            className="px-2.5 h-8 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            Terapkan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`${thBase} ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.label}
                    <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} className="px-2 py-3 text-center text-gray-400">
                    Tidak ada data
                  </td>
                </tr>
              )}
              {sorted.map((c) => (
                <tr key={c.customerName} className="border-b last:border-b-0">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{c.customerName}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(c.telurBagusKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(c.telurRetakKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(c.telurBuleKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatRupiah(c.totalJual)}</td>
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-semibold text-gray-800">
                  <td className="px-2 py-1.5">Total</td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(salesReport.reduce((sum, c) => sum + c.telurBagusKg, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(salesReport.reduce((sum, c) => sum + c.telurRetakKg, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatNumber(salesReport.reduce((sum, c) => sum + c.telurBuleKg, 0))}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {formatRupiah(salesReport.reduce((sum, c) => sum + c.totalJual, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
