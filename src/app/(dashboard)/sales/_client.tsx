"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, parseISO } from "date-fns";
import {
  Plus, Search, Edit2, Trash2, Loader2, X, FileText, Printer, FileDown,
  ArrowUpDown, ArrowUp, ArrowDown, ListChecks, CheckSquare, Square,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, formatRupiah, todayISO } from "@/lib/utils";
import type { EggSale } from "@/types";

const EGG_TYPE_LABELS: Record<string, string> = {
  TELUR_BAGUS: "Telur Bagus",
  TELUR_RETAK: "Telur Retak",
  TELUR_BULE: "Telur Bule",
};

const schema = z.object({
  date: z.string().min(1),
  customerName: z.string().min(1, "Nama pelanggan wajib diisi"),
  eggType: z.enum(["TELUR_BAGUS", "TELUR_RETAK", "TELUR_BULE"]).optional().or(z.literal("")),
  qtySold: z.coerce.number().min(0.01, "Jumlah minimal 0.01"),
  unitPrice: z.coerce.number().min(1, "Harga wajib diisi"),
  jatuhTempoDays: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  notes: z.string().optional(),
});

function dueDate(saleDate: string, days?: number | null): Date | null {
  if (days === null || days === undefined) return null;
  return addDays(parseISO(saleDate), days);
}

type FormData = z.infer<typeof schema>;

interface Props {
  initialData: EggSale[];
}

function InvoiceView({ sale, companyName, companyNotes, companyLogo }: { sale: EggSale; companyName?: string | null; companyNotes?: string | null; companyLogo?: string | null }) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = invoiceRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice ${sale.invoiceNo ?? ""}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 14px; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
        .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; }
        .label { color: #555; }
        .total { font-size: 16px; font-weight: bold; }
        .footer { text-align: center; color: #999; font-size: 11px; margin-top: 20px; }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="space-y-4">
      <div ref={invoiceRef} className="p-4 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">INVOICE</h2>
            {companyName && <p className="text-lg font-bold text-gray-800 subtitle">{companyName}</p>}
            {companyNotes && <p className="text-xs text-gray-400 mt-0.5">{companyNotes}</p>}
          </div>
          {companyLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyLogo} alt="Logo" className="w-12 h-12 object-contain shrink-0" />
          )}
        </div>
        <div className="divider border-t border-dashed border-gray-200 my-3" />
        <div className="space-y-2 text-sm">
          <div className="row flex justify-between">
            <span className="label text-gray-500">No. Invoice</span>
            <span className="font-mono font-semibold">{sale.invoiceNo ?? "–"}</span>
          </div>
          <div className="row flex justify-between">
            <span className="label text-gray-500">Tanggal</span>
            <span>{formatDate(sale.date)}</span>
          </div>
          <div className="row flex justify-between">
            <span className="label text-gray-500">Pelanggan</span>
            <span className="font-medium">{sale.customerName}</span>
          </div>
          {sale.jatuhTempoDays != null && (
            <div className="row flex justify-between">
              <span className="label text-gray-500">Jatuh Tempo</span>
              <span className="font-medium text-red-600">
                {(() => {
                  const d = dueDate(sale.date, sale.jatuhTempoDays);
                  return d ? `${formatDate(d)} (${sale.jatuhTempoDays} hari)` : "–";
                })()}
              </span>
            </div>
          )}
        </div>
        <div className="divider border-t border-dashed border-gray-200 my-3" />
        <div className="space-y-2 text-sm">
          {sale.eggType && (
            <div className="row flex justify-between">
              <span className="label text-gray-500">Jenis Telur</span>
              <span>{EGG_TYPE_LABELS[sale.eggType] ?? sale.eggType}</span>
            </div>
          )}
          <div className="row flex justify-between">
            <span className="label text-gray-500">Telur (kg)</span>
            <span>{formatNumber(sale.qtySold)} kg</span>
          </div>
          <div className="row flex justify-between">
            <span className="label text-gray-500">Harga/kg</span>
            <span>{formatRupiah(sale.unitPrice)}</span>
          </div>
        </div>
        <div className="divider border-t border-gray-200 my-3" />
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Total</span>
          <span className="total text-lg font-bold text-green-700">{formatRupiah(sale.totalValue)}</span>
        </div>
        {sale.notes && (
          <p className="text-xs text-gray-400 mt-3 italic">{sale.notes}</p>
        )}
        <div className="footer text-center text-xs text-gray-300 mt-4 pt-3 border-t border-gray-100">
          Terima kasih atas kepercayaan Anda
        </div>
      </div>
      <Button onClick={handlePrint} className="w-full h-11 flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
        <Printer className="w-4 h-4" />
        Cetak Invoice
      </Button>
    </div>
  );
}

const TABLE_COLS: { key: string; label: string; align?: "right" }[] = [
  { key: "date",          label: "Tanggal" },
  { key: "customerName",  label: "Pelanggan" },
  { key: "eggType",       label: "Jenis Telur" },
  { key: "qtySold",       label: "Jumlah (kg)", align: "right" },
  { key: "unitPrice",     label: "Harga/kg",    align: "right" },
  { key: "totalValue",    label: "Total",       align: "right" },
  { key: "jatuhTempoDays",label: "Jatuh Tempo", align: "right" },
  { key: "invoiceNo",     label: "No. Invoice" },
];

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-green-600 ml-0.5 inline-block" />
    : <ArrowDown className="w-3 h-3 text-green-600 ml-0.5 inline-block" />;
}

function SalesTable({
  records, sortCol, sortDir, selectMode, selectedIds, isOwner,
  onSort, onToggleSelected, onEdit, onDelete, onInvoice,
}: {
  records: EggSale[];
  sortCol: string;
  sortDir: "asc" | "desc";
  selectMode: boolean;
  selectedIds: string[];
  isOwner: boolean;
  onSort: (col: string) => void;
  onToggleSelected: (id: string) => void;
  onEdit: (r: EggSale) => void;
  onDelete: (id: string) => void;
  onInvoice: (r: EggSale) => void;
}) {
  const thBase = "px-2 py-2 font-semibold text-gray-600 whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 border-b border-gray-200";

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 800 }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {selectMode && <th className="w-8 px-2 py-2 border-b border-gray-200" />}
            {TABLE_COLS.map((col) => (
              <th
                key={col.key}
                className={`${thBase} ${col.align === "right" ? "text-right" : "text-left"}`}
                onClick={() => onSort(col.key)}
              >
                {col.label}
                <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
              </th>
            ))}
            <th className="px-2 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">Catatan</th>
            <th className="px-2 py-2 border-b border-gray-200 w-20" />
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const isSelected = selectedIds.includes(r.id);
            const due = r.jatuhTempoDays != null ? dueDate(r.date, r.jatuhTempoDays) : null;
            const rowCls = [
              idx % 2 === 1 ? "bg-gray-50/60" : "bg-white",
              isSelected ? "!bg-green-50" : "",
              selectMode ? "cursor-pointer" : "",
              "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
            ].join(" ");

            return (
              <tr key={r.id} className={rowCls} onClick={selectMode ? () => onToggleSelected(r.id) : undefined}>
                {selectMode && (
                  <td className="px-2 py-1.5 text-center" onClick={(e) => { e.stopPropagation(); onToggleSelected(r.id); }}>
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-green-600 inline" />
                      : <Square className="w-4 h-4 text-gray-300 inline" />}
                  </td>
                )}
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-medium text-gray-800">{r.customerName}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                  {r.eggType ? (EGG_TYPE_LABELS[r.eggType] ?? r.eggType) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">{formatNumber(r.qtySold)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{formatRupiah(r.unitPrice)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-purple-600 font-semibold">{formatRupiah(r.totalValue)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-red-500">
                  {due ? `${formatDate(due)}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap font-mono text-gray-400">{r.invoiceNo ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 max-w-[100px]">
                  <span className="truncate block text-gray-400">{r.notes ?? ""}</span>
                </td>
                <td className="px-2 py-1.5">
                  {!selectMode && (
                    <div className="flex gap-0.5 justify-end">
                      {r.invoiceNo && (
                        <button onClick={(e) => { e.stopPropagation(); onInvoice(r); }} className="p-1 rounded hover:bg-blue-50">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); onEdit(r); }} className="p-1 rounded hover:bg-gray-100">
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      {isOwner && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(r.id); }} className="p-1 rounded hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
        {records.length} baris
      </div>
    </div>
  );
}

export default function SalesClient({ initialData }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [records, setRecords] = useState<EggSale[]>(initialData);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [invoiceSale, setInvoiceSale] = useState<EggSale | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pageSize, setPageSize] = useState<"50" | "100" | "200" | "all">("50");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), customerName: "", eggType: "", qtySold: 1, unitPrice: 0, jatuhTempoDays: "", notes: "" },
  });

  const watchQty = form.watch("qtySold");
  const watchPrice = form.watch("unitPrice");
  useEffect(() => {
    setTotalValue((watchQty ?? 0) * (watchPrice ?? 0));
  }, [watchQty, watchPrice]);

  const hasActiveFilter = search !== "" || dateFrom !== "" || dateTo !== "";

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const limit = hasActiveFilter ? "5000" : pageSize === "all" ? "5000" : pageSize;
      params.set("limit", limit);
      const res = await fetch(`/api/v1/sales?${params}`);
      const json = await res.json();
      setRecords(json.data ?? []);
    } finally {
      setFetching(false);
    }
  }, [search, dateFrom, dateTo, hasActiveFilter, pageSize]);

  const isFirstFetch = useRef(true);
  useEffect(() => {
    // initialData from SSR already matches the default filters/pageSize, so
    // skip the redundant refetch on first mount.
    if (isFirstFetch.current) {
      isFirstFetch.current = false;
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    fetch("/api/v1/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setCompanyLogo(json?.logoUrl ?? null))
      .catch(() => setCompanyLogo(null));
  }, []);

  const displayRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let av: number | string | null = null;
      let bv: number | string | null = null;
      if (sortCol === "date") { av = a.date; bv = b.date; }
      else if (sortCol === "customerName") { av = a.customerName; bv = b.customerName; }
      else if (sortCol === "eggType") { av = a.eggType ?? ""; bv = b.eggType ?? ""; }
      else if (sortCol === "qtySold") { av = a.qtySold; bv = b.qtySold; }
      else if (sortCol === "unitPrice") { av = a.unitPrice; bv = b.unitPrice; }
      else if (sortCol === "totalValue") { av = a.totalValue; bv = b.totalValue; }
      else if (sortCol === "jatuhTempoDays") { av = a.jatuhTempoDays ?? null; bv = b.jatuhTempoDays ?? null; }
      else if (sortCol === "invoiceNo") { av = a.invoiceNo ?? ""; bv = b.invoiceNo ?? ""; }
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [records, sortCol, sortDir]);

  async function exportToExcel() {
    const XLSX = await import("xlsx");
    const rows = displayRecords.map((r) => {
      const due = r.jatuhTempoDays != null ? dueDate(r.date, r.jatuhTempoDays) : null;
      return {
        Tanggal: formatDate(r.date),
        Pelanggan: r.customerName,
        "Jenis Telur": r.eggType ? (EGG_TYPE_LABELS[r.eggType] ?? r.eggType) : "",
        "Jumlah (kg)": Number(r.qtySold),
        "Harga/kg": Number(r.unitPrice),
        Total: Number(r.totalValue),
        "Jatuh Tempo": due ? formatDate(due) : "",
        "No. Invoice": r.invoiceNo ?? "",
        Catatan: r.notes ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penjualan Telur");
    const suffix = dateFrom && dateTo
      ? `${dateFrom}_${dateTo}`
      : dateFrom ? `dari_${dateFrom}`
      : dateTo ? `sd_${dateTo}`
      : todayISO();
    XLSX.writeFile(wb, `penjualan-${suffix}.xlsx`);
    toast({ variant: "success", title: "File Excel diunduh" });
  }

  function openCreate() {
    form.reset({ date: todayISO(), customerName: "", eggType: "", qtySold: 1, unitPrice: 0, jatuhTempoDays: "", notes: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(record: EggSale) {
    form.reset({
      date: record.date.split("T")[0],
      customerName: record.customerName,
      eggType: (record.eggType as FormData["eggType"]) ?? "",
      qtySold: record.qtySold,
      unitPrice: record.unitPrice,
      jatuhTempoDays: record.jatuhTempoDays ?? "",
      notes: record.notes ?? "",
    });
    setEditingId(record.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/sales/${editingId}` : "/api/v1/sales";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        ...data,
        eggType: data.eggType !== "" ? data.eggType : null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: "Data disimpan" });
      setIsSheetOpen(false);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/v1/sales/${deleteId}`, { method: "DELETE" });
      toast({ variant: "success", title: "Data dihapus" });
      setDeleteId(null);
      fetchData();
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAllVisible() {
    setSelectedIds((prev) =>
      prev.length === displayRecords.length ? [] : displayRecords.map((r) => r.id)
    );
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/v1/sales/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ variant: "success", title: `${json.count} data penjualan dihapus` });
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      setSelectMode(false);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setBulkDeleting(false);
    }
  }

  const isOwner = (session?.user?.role === "OWNER" || session?.user?.role === "DEVELOPER");

  return (
    <>
      <MobileHeader title="Penjualan Telur" />
      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

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
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-gray-400 underline shrink-0"
            >
              Reset tanggal
            </button>
          )}

          <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden shrink-0 ml-auto">
            {(["50", "100", "200", "all"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPageSize(v)}
                className={`px-2 h-9 text-xs font-medium transition-colors ${
                  pageSize === v
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {v === "all" ? "Semua" : v}
              </button>
            ))}
          </div>

          {displayRecords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs shrink-0 border-green-200 text-green-700 hover:bg-green-50"
              onClick={exportToExcel}
            >
              <FileDown className="w-3.5 h-3.5" />
              Excel
            </Button>
          )}

          {isOwner && (
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              className={`h-9 gap-1.5 text-xs shrink-0 ${selectMode ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={toggleSelectMode}
            >
              <ListChecks className="w-3.5 h-3.5" />
              {selectMode ? "Batal Pilih" : "Pilih"}
            </Button>
          )}
        </div>

        {selectMode && (
          <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2">
            <button onClick={selectAllVisible} className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
              {selectedIds.length > 0 && selectedIds.length === displayRecords.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Pilih semua ({displayRecords.length})
            </button>
            <span className="text-xs text-green-700">{selectedIds.length} dipilih</span>
          </div>
        )}

        {fetching ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full rounded" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🛒</p>
            <p className="text-sm">Belum ada data penjualan</p>
          </div>
        ) : displayRecords.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm">Tidak ada data yang cocok dengan filter</p>
          </div>
        ) : (
          <SalesTable
            records={displayRecords}
            sortCol={sortCol}
            sortDir={sortDir}
            selectMode={selectMode}
            selectedIds={selectedIds}
            isOwner={isOwner}
            onSort={(col) => {
              if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else { setSortCol(col); setSortDir("asc"); }
            }}
            onToggleSelected={toggleSelected}
            onEdit={openEdit}
            onDelete={(id) => setDeleteId(id)}
            onInvoice={(r) => setInvoiceSale(r)}
          />
        )}
      </div>

      {selectMode && selectedIds.length > 0 ? (
        <div
          className="fixed left-0 right-0 z-30 px-4 flex justify-center"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-3 flex items-center gap-3 max-w-md w-full">
            <span className="text-sm text-gray-600 flex-1">{selectedIds.length} data dipilih</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>Batal</Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5">
              <Trash2 className="w-4 h-4" /> Hapus
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={openCreate}
          className="fixed right-4 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center z-30"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingId ? "Edit Penjualan" : "Tambah Penjualan"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Pelanggan</Label>
                <Input placeholder="Budi" className="h-11" {...form.register("customerName")} />
                {form.formState.errors.customerName && (
                  <p className="text-xs text-red-500">{form.formState.errors.customerName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan Telur</Label>
              <Select onValueChange={(v) => form.setValue("eggType", v as FormData["eggType"])} value={form.watch("eggType")}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Pilih keterangan telur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELUR_BAGUS">Telur Bagus</SelectItem>
                  <SelectItem value="TELUR_RETAK">Telur Retak</SelectItem>
                  <SelectItem value="TELUR_BULE">Telur Bule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Jumlah (kg)</Label>
                <Input type="number" min="0.01" step="0.01" className="h-11" {...form.register("qtySold")} />
                {form.formState.errors.qtySold && (
                  <p className="text-xs text-red-500">{form.formState.errors.qtySold.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Harga/kg (Rp)</Label>
                <Input type="number" min="0" className="h-11" {...form.register("unitPrice")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jatuh Tempo (hari, opsional)</Label>
              <Input type="number" min="0" step="1" placeholder="Contoh: 14" className="h-11" {...form.register("jatuhTempoDays")} />
              <p className="text-xs text-gray-400">Jumlah hari dari tanggal penjualan sampai batas pembayaran. Kosongkan jika tidak ada tempo.</p>
            </div>
            {totalValue > 0 && (
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-600">Total Penjualan</p>
                <p className="text-lg font-bold text-purple-700">{formatRupiah(totalValue)}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea placeholder="Catatan..." rows={2} {...form.register("notes")} />
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setIsSheetOpen(false)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!invoiceSale} onOpenChange={() => setInvoiceSale(null)}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Invoice</SheetTitle>
          </SheetHeader>
          {invoiceSale && (
            <InvoiceView
              sale={invoiceSale}
              companyName={session?.user?.companyName}
              companyNotes={session?.user?.notes}
              companyLogo={companyLogo}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus Data?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Data penjualan ini akan dihapus permanen.</p>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus {selectedIds.length} Data?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">
            {selectedIds.length} catatan penjualan yang dipilih akan dihapus permanen.
          </p>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Hapus ${selectedIds.length} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
