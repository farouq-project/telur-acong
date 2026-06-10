"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNumber, todayISO } from "@/lib/utils";
import type { HouseReport } from "@/services/production.service";

type SortCol = "house" | "populasi" | "mati" | "pakanKg" | "telurBagusKg" | "telurRetakKg";

const COLS: { key: SortCol; label: string; align?: "right" }[] = [
  { key: "house", label: "Kandang" },
  { key: "populasi", label: "Populasi", align: "right" },
  { key: "mati", label: "Mati", align: "right" },
  { key: "pakanKg", label: "Pakan (kg)", align: "right" },
  { key: "telurBagusKg", label: "Telur Bagus (kg)", align: "right" },
  { key: "telurRetakKg", label: "Telur Retak (kg)", align: "right" },
];

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-green-600 ml-0.5 inline-block" />
    : <ArrowDown className="w-3 h-3 text-green-600 ml-0.5 inline-block" />;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

export function HouseReportCard({
  houseReport, jualBagusKg, jualRetakKg, stokTelurBagus, stokTelurRetak, from, to,
}: {
  houseReport: HouseReport[];
  jualBagusKg: number;
  jualRetakKg: number;
  stokTelurBagus: number;
  stokTelurRetak: number;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const [sortCol, setSortCol] = useState<SortCol>("house");
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
    const params = new URLSearchParams();
    if (newFrom) params.set("from", newFrom);
    if (newTo) params.set("to", newTo);
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  }

  function setToday() {
    const d = todayISO();
    setFromInput(d);
    setToInput(d);
    applyRange(d, d);
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
    const arr = [...houseReport];
    arr.sort((a, b) => {
      if (sortCol === "house") {
        return sortDir === "asc" ? a.house.localeCompare(b.house) : b.house.localeCompare(a.house);
      }
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [houseReport, sortCol, sortDir]);

  const thBase = "font-medium px-2 py-1.5 select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap";
  const presetBtn = "px-2.5 h-8 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50";
  const presetBtnActive = "px-2.5 h-8 rounded-lg text-xs font-medium border border-green-600 bg-green-600 text-white";

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-green-600" />
          Laporan Produksi & Penjualan
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-2 pb-3 text-xs">
          <button onClick={setToday} className={!from && !to ? presetBtn : (from === todayISO() && to === todayISO()) ? presetBtnActive : presetBtn}>
            Hari Ini
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
                <th className="text-right font-medium px-2 py-1.5">Jual Bagus (kg)</th>
                <th className="text-right font-medium px-2 py-1.5">Jual Retak (kg)</th>
                <th className="text-right font-medium px-2 py-1.5">Stok Bagus (kg)</th>
                <th className="text-right font-medium px-2 py-1.5">Stok Retak (kg)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => (
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
                  {formatNumber(houseReport.reduce((sum, h) => sum + (h.populasi ?? 0), 0))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.mati, 0))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.pakanKg, 0))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.telurBagusKg, 0))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.telurRetakKg, 0))}
                </td>
                <td className="px-2 py-1.5 text-right">{formatNumber(jualBagusKg)}</td>
                <td className="px-2 py-1.5 text-right">{formatNumber(jualRetakKg)}</td>
                <td className="px-2 py-1.5 text-right">{formatNumber(stokTelurBagus)}</td>
                <td className="px-2 py-1.5 text-right">{formatNumber(stokTelurRetak)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
