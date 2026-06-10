"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, todayISO } from "@/lib/utils";
import type { SoTelurDay } from "@/types";

const opnameSchema = z.object({
  date: z.string().min(1),
  telurBagusKg: z.coerce.number().min(0),
  telurRetakKg: z.coerce.number().min(0),
  telurBuleKg: z.coerce.number().min(0),
});

type OpnameForm = z.infer<typeof opnameSchema>;

interface Props {
  initialData: SoTelurDay[];
}

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-green-600 ml-0.5 inline-block" />
    : <ArrowDown className="w-3 h-3 text-green-600 ml-0.5 inline-block" />;
}

function Th({ col, label, sortCol, sortDir, onSort }: {
  col: string; label: string; sortCol: string; sortDir: "asc" | "desc"; onSort: (col: string) => void;
}) {
  return (
    <th
      className="px-2 py-2 text-right font-semibold text-gray-600 whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 border-b border-gray-200"
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );
}

function Cell({ value, bold }: { value: number | null; bold?: boolean }) {
  return (
    <td className={`px-2 py-1.5 text-right font-mono ${bold ? "font-semibold text-gray-800" : ""}`}>
      {value != null ? formatNumber(value) : <span className="text-gray-300">—</span>}
    </td>
  );
}

export default function SoTelurClient({ initialData }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<SoTelurDay[]>(initialData);
  const [fetching, setFetching] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OpnameForm>({
    resolver: zodResolver(opnameSchema),
    defaultValues: { date: todayISO(), telurBagusKg: 0, telurRetakKg: 0, telurBuleKg: 0 },
  });

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const json = await fetch(`/api/v1/so-telur?${params}`).then((r) => r.json());
      setData(json.data ?? []);
    } finally {
      setFetching(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  const displayData = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortCol as keyof SoTelurDay];
      const bv = b[sortCol as keyof SoTelurDay];
      const an = av === null ? -Infinity : av;
      const bn = bv === null ? -Infinity : bv;
      if (typeof an === "string" && typeof bn === "string") {
        return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
      }
      return sortDir === "asc" ? (an as number) - (bn as number) : (bn as number) - (an as number);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortCol, sortDir]);

  function openOpname() {
    form.reset({ date: todayISO(), telurBagusKg: 0, telurRetakKg: 0, telurBuleKg: 0 });
    setSheetOpen(true);
  }

  async function onSubmit(values: OpnameForm) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/so-telur-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "SO Telur disimpan" });
      setSheetOpen(false);
      fetchData();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  return (
    <>
      <MobileHeader title="SO Telur" />
      <div className="px-4 py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[130px] text-xs px-2"
          />
          <span className="text-xs text-gray-400">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[130px] text-xs px-2"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-gray-400 underline shrink-0">
              Reset tanggal
            </button>
          )}
        </div>

        {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
          displayData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Belum ada data</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-[11px]" style={{ minWidth: 920 }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 border-b border-gray-200"
                      onClick={() => handleSort("date")}
                    >
                      Tanggal
                      <SortIcon col="date" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <Th col="telurBagusKg" label="Telur Bagus (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="telurRetakKg" label="Telur Retak (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="telurBuleKg" label="Telur Bule (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="totalProduksiKg" label="Total Produksi (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="telurBagusRealKg" label="Bagus Real (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="telurRetakRealKg" label="Retak Real (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="telurBuleRealKg" label="Bule Real (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                    <Th col="totalRealKg" label="Total Real (kg)" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((r, idx) => (
                    <tr key={r.date} className={`${idx % 2 === 1 ? "bg-gray-50/60" : "bg-white"} border-b border-gray-100`}>
                      <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
                      <Cell value={r.telurBagusKg} />
                      <Cell value={r.telurRetakKg} />
                      <Cell value={r.telurBuleKg} />
                      <Cell value={r.totalProduksiKg} bold />
                      <Cell value={r.telurBagusRealKg} />
                      <Cell value={r.telurRetakRealKg} />
                      <Cell value={r.telurBuleRealKg} />
                      <Cell value={r.totalRealKg} bold />
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">{displayData.length} baris</div>
            </div>
          )
        }
      </div>

      <button
        onClick={openOpname}
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Tambah SO Telur"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>SO Telur (Stok Real)</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" className="h-11" {...form.register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Telur Bagus Real (kg)</Label>
              <Input type="number" step="0.01" min="0" className="h-11" {...form.register("telurBagusKg")} />
            </div>
            <div className="space-y-1.5">
              <Label>Telur Retak Real (kg)</Label>
              <Input type="number" step="0.01" min="0" className="h-11" {...form.register("telurRetakKg")} />
            </div>
            <div className="space-y-1.5">
              <Label>Telur Bule Real (kg)</Label>
              <Input type="number" step="0.01" min="0" className="h-11" {...form.register("telurBuleKg")} />
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setSheetOpen(false)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
