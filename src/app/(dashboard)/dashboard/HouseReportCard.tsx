"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatNumber, todayISO } from "@/lib/utils";
import type { HouseReport } from "@/services/production.service";

type SortCol = "house" | "populasi" | "mati" | "umurAyam" | "pakanKg" | "butirBagus" | "butirRetak" | "telurBagusKg" | "telurRetakKg" | "fcr" | "hd" | "feedIntake";

const COLS: { key: SortCol; label: string; align?: "right" }[] = [
  { key: "house", label: "Kandang" },
  { key: "populasi", label: "Populasi", align: "right" },
  { key: "mati", label: "Mati", align: "right" },
  { key: "umurAyam", label: "Umur (mgg)", align: "right" },
  { key: "pakanKg", label: "Pakan (kg)", align: "right" },
  { key: "telurBagusKg", label: "Telur Bagus (kg)", align: "right" },
  { key: "telurRetakKg", label: "Telur Retak (kg)", align: "right" },
  { key: "butirBagus", label: "Butir Bagus", align: "right" },
  { key: "butirRetak", label: "Butir Retak", align: "right" },
  { key: "fcr", label: "FCR (avg)", align: "right" },
  { key: "hd", label: "HD % (avg)", align: "right" },
  { key: "feedIntake", label: "FI (avg)", align: "right" },
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
  houseReport, from, to,
}: {
  houseReport: HouseReport[];
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
    const params = new URLSearchParams(window.location.search);
    if (newFrom) params.set("from", newFrom); else params.delete("from");
    if (newTo) params.set("to", newTo); else params.delete("to");
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

  async function exportToExcel() {
    const XLSX = await import("xlsx");
    const rows = sorted.map((h) => ({
      Kandang: h.house,
      Populasi: h.populasi ?? 0,
      Mati: h.mati,
      "Umur (mgg)": h.umurAyam ?? "",
      "Pakan (kg)": h.pakanKg,
      "Telur Bagus (kg)": h.telurBagusKg,
      "Telur Retak (kg)": h.telurRetakKg,
      "Butir Bagus": h.butirBagus ?? 0,
      "Butir Retak": h.butirRetak ?? 0,
      "FCR (avg)": h.fcr != null ? parseFloat(h.fcr.toFixed(3)) : "",
      "HD % (avg)": h.hd != null ? parseFloat(h.hd.toFixed(1)) : "",
      "FI (avg)": h.feedIntake != null ? parseFloat(h.feedIntake.toFixed(3)) : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
      { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Produksi");
    const suffix = from && to ? `${from}_${to}` : from ? `dari_${from}` : todayISO();
    XLSX.writeFile(wb, `laporan-produksi-${suffix}.xlsx`);
  }

  const thBase = "font-medium px-2 py-1.5 select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap";
  const presetBtn = "px-2.5 h-8 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50";
  const presetBtnActive = "px-2.5 h-8 rounded-lg text-xs font-medium border border-green-600 bg-green-600 text-white";

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-green-600" />
          Laporan Produksi
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={exportToExcel}
          className="h-7 px-2 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
        >
          <FileDown className="w-3.5 h-3.5" />
          Excel
        </Button>
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
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => (
                <tr key={h.house} className="border-b last:border-b-0">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{h.house}</td>
                  <td className="px-2 py-1.5 text-right">{h.populasi != null ? formatNumber(h.populasi) : "-"}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(h.mati)}</td>
                  <td className="px-2 py-1.5 text-right">{h.umurAyam != null ? h.umurAyam : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(h.pakanKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(h.telurBagusKg)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(h.telurRetakKg)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-green-700 font-semibold">{formatNumber(h.butirBagus ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-yellow-600">{(h.butirRetak ?? 0) > 0 ? formatNumber(h.butirRetak) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-purple-600">{h.fcr != null ? h.fcr.toFixed(3) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-blue-600">{h.hd != null ? h.hd.toFixed(1) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-amber-700">{h.feedIntake != null ? h.feedIntake.toFixed(3) : <span className="text-gray-300">—</span>}</td>
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
                <td className="px-2 py-1.5 text-right text-gray-300">—</td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.pakanKg, 0))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.telurBagusKg, 0))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(houseReport.reduce((sum, h) => sum + h.telurRetakKg, 0))}
                </td>
                <td className="px-2 py-1.5 text-right font-semibold">
                  {formatNumber(houseReport.reduce((sum, h) => sum + (h.butirBagus ?? 0), 0))}
                </td>
                <td className="px-2 py-1.5 text-right font-semibold">
                  {formatNumber(houseReport.reduce((sum, h) => sum + (h.butirRetak ?? 0), 0))}
                </td>
                <td className="px-2 py-1.5 text-right text-gray-300">—</td>
                <td className="px-2 py-1.5 text-right text-gray-300">—</td>
                <td className="px-2 py-1.5 text-right text-gray-300">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
