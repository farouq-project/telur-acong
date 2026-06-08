"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import {
  Plus, Search, Edit2, Trash2, Loader2, X, FileSpreadsheet, Download, Upload,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, todayISO } from "@/lib/utils";
import type { EggProduction, House, FeedProduct } from "@/types";

// ─── Import Excel: kolom template & parsing ──────────────────────────────────

const IMPORT_COLUMNS = [
  { key: "date", header: "Tanggal (YYYY-MM-DD)" },
  { key: "house", header: "Kandang" },
  { key: "goodEggs", header: "Telur Bagus (butir)" },
  { key: "crackedEggs", header: "Retak (butir)" },
  { key: "goodEggsKg", header: "Bagus (kg)" },
  { key: "crackedEggsKg", header: "Retak (kg)" },
  { key: "feedQtyKg", header: "Pakan (kg)" },
  { key: "feedProduct", header: "Jenis Pakan" },
  { key: "populasi", header: "Populasi (ekor)" },
  { key: "mortality", header: "Kematian (ekor)" },
  { key: "notes", header: "Catatan" },
] as const;

function downloadProductionTemplate(feedProducts: FeedProduct[]) {
  const headers = IMPORT_COLUMNS.map((c) => c.header);
  const sampleFeedProduct = feedProducts[0]?.name ?? "Konsentrat A";
  const sample = ["2026-06-01", "Kandang A", 950, 20, 56.5, 1.1, 120, sampleFeedProduct, 5000, 2, "Contoh baris — silakan hapus sebelum import"];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produksi");
  XLSX.writeFile(wb, "template-produksi-telur.xlsx");
}

function parseDateCell(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return format(value, "yyyy-MM-dd");
  const str = String(value).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const parsed = parseISO(str);
  if (!isNaN(parsed.getTime())) return format(parsed, "yyyy-MM-dd");
  return null;
}

function parseNumberCell(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isNaN(num) ? null : num;
}

interface ImportRow {
  rowNum: number;
  date: string;
  house: string;
  goodEggs: number;
  crackedEggs: number;
  goodEggsKg: number | null;
  crackedEggsKg: number | null;
  feedQtyKg: number | null;
  feedProductName: string | null;
  feedProductId: string | null;
  populasi: number | null;
  mortality: number | null;
  notes: string | null;
}

interface ImportError {
  rowNum: number;
  message: string;
}

interface ImportResult {
  rows: ImportRow[];
  errors: ImportError[];
}

function parseImportWorkbook(workbook: XLSX.WorkBook, feedProducts: FeedProduct[]): ImportResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const headerToKey = new Map(IMPORT_COLUMNS.map((c) => [c.header.trim().toLowerCase(), c.key]));

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];

  raw.forEach((rawRow, idx) => {
    const rowNum = idx + 2;
    const mapped: Record<string, unknown> = {};
    for (const [rawHeader, value] of Object.entries(rawRow)) {
      const key = headerToKey.get(String(rawHeader).trim().toLowerCase());
      if (key) mapped[key] = value;
    }

    if (Object.values(mapped).every((v) => v === "" || v == null)) return;

    const date = parseDateCell(mapped.date);
    const house = mapped.house != null ? String(mapped.house).trim() : "";
    const goodEggs = parseNumberCell(mapped.goodEggs);

    if (!date) { errors.push({ rowNum, message: "Tanggal tidak valid (gunakan format YYYY-MM-DD)" }); return; }
    if (!house) { errors.push({ rowNum, message: "Kandang wajib diisi" }); return; }
    if (goodEggs === null) { errors.push({ rowNum, message: "Telur Bagus (butir) wajib berupa angka" }); return; }

    const feedProductName = mapped.feedProduct != null && String(mapped.feedProduct).trim() !== ""
      ? String(mapped.feedProduct).trim()
      : null;
    let feedProductId: string | null = null;
    if (feedProductName) {
      const match = feedProducts.find((p) => p.name.trim().toLowerCase() === feedProductName.trim().toLowerCase());
      if (!match) { errors.push({ rowNum, message: `Jenis Pakan "${feedProductName}" tidak ditemukan di daftar Produk Pakan` }); return; }
      feedProductId = match.id;
    }

    rows.push({
      rowNum,
      date,
      house,
      goodEggs,
      crackedEggs: parseNumberCell(mapped.crackedEggs) ?? 0,
      goodEggsKg: parseNumberCell(mapped.goodEggsKg),
      crackedEggsKg: parseNumberCell(mapped.crackedEggsKg),
      feedQtyKg: parseNumberCell(mapped.feedQtyKg),
      feedProductName,
      feedProductId,
      populasi: parseNumberCell(mapped.populasi),
      mortality: parseNumberCell(mapped.mortality),
      notes: mapped.notes != null && String(mapped.notes).trim() !== "" ? String(mapped.notes).trim() : null,
    });
  });

  return { rows, errors };
}

const schema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  house: z.string().min(1, "Kandang wajib diisi"),
  goodEggs: z.coerce.number().min(0, "Minimal 0"),
  crackedEggs: z.coerce.number().min(0, "Minimal 0"),
  populasi: z.coerce.number().min(0).optional().or(z.literal("")),
  goodEggsKg: z.coerce.number().min(0).optional().or(z.literal("")),
  crackedEggsKg: z.coerce.number().min(0).optional().or(z.literal("")),
  feedQtyKg: z.coerce.number().min(0).optional().or(z.literal("")),
  feedProductId: z.string().optional().or(z.literal("")),
  mortality: z.coerce.number().min(0).optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData: EggProduction[];
  houses: House[];
  feedProducts: FeedProduct[];
}

function computeMetrics(r: EggProduction) {
  const totalEggs = r.goodEggs + r.crackedEggs;
  const totalEggsKg = (r.goodEggsKg ?? 0) + (r.crackedEggsKg ?? 0);
  const sisaPopulasi = r.populasi != null ? r.populasi - (r.mortality ?? 0) : null;
  const hd = sisaPopulasi && sisaPopulasi > 0 ? ((totalEggs / sisaPopulasi) * 100) : null;
  const feedIntake = sisaPopulasi && sisaPopulasi > 0 && r.feedQtyKg ? (r.feedQtyKg / sisaPopulasi) : null;
  const fcr = totalEggsKg > 0 && r.feedQtyKg ? (r.feedQtyKg / totalEggsKg) : null;
  const hpp = r.goodEggsKg && r.goodEggsKg > 0 && r.feedQtyKg && r.feedPricePerKg
    ? ((r.feedQtyKg * r.feedPricePerKg) / r.goodEggsKg)
    : null;
  return { hd, feedIntake, fcr, hpp };
}

export default function ProductionClient({ initialData, houses, feedProducts }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [records, setRecords] = useState<EggProduction[]>(initialData);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayISO(), house: "", goodEggs: 0, crackedEggs: 0,
      populasi: "", goodEggsKg: "", crackedEggsKg: "",
      feedQtyKg: "", feedProductId: "", mortality: "", notes: "",
    },
  });

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/production?${params}`);
      const json = await res.json();
      setRecords(json.data ?? []);
    } finally {
      setFetching(false);
    }
  }, [search]);

  useEffect(() => {
    if (search !== "") fetchData();
    else if (records !== initialData) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const defaultValues = {
    date: todayISO(), house: "", goodEggs: 0, crackedEggs: 0,
    populasi: "" as const, goodEggsKg: "" as const, crackedEggsKg: "" as const,
    feedQtyKg: "" as const, feedProductId: "" as const,
    mortality: "" as const, notes: "",
  };

  function openCreate() {
    form.reset(defaultValues);
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(record: EggProduction) {
    form.reset({
      date: record.date.split("T")[0],
      house: record.house,
      goodEggs: record.goodEggs,
      crackedEggs: record.crackedEggs,
      populasi: record.populasi ?? "",
      goodEggsKg: record.goodEggsKg ?? "",
      crackedEggsKg: record.crackedEggsKg ?? "",
      feedQtyKg: record.feedQtyKg ?? "",
      feedProductId: record.feedProductId ?? "",
      mortality: record.mortality ?? "",
      notes: record.notes ?? "",
    });
    setEditingId(record.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/production/${editingId}` : "/api/v1/production";
      const method = editingId ? "PUT" : "POST";
      const payload = {
        ...data,
        populasi: data.populasi !== "" ? data.populasi : null,
        goodEggsKg: data.goodEggsKg !== "" ? data.goodEggsKg : null,
        crackedEggsKg: data.crackedEggsKg !== "" ? data.crackedEggsKg : null,
        feedQtyKg: data.feedQtyKg !== "" ? data.feedQtyKg : null,
        feedProductId: data.feedProductId !== "" ? data.feedProductId : null,
        mortality: data.mortality !== "" ? data.mortality : null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ variant: "success", title: editingId ? "Data diperbarui" : "Data ditambahkan" });
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
      const res = await fetch(`/api/v1/production/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Data dihapus" });
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array", cellDates: true });
      const result = parseImportWorkbook(workbook, feedProducts);
      if (result.rows.length === 0 && result.errors.length === 0) {
        toast({ variant: "destructive", title: "File kosong", description: "Tidak ada data yang ditemukan dalam file" });
        return;
      }
      setImportResult(result);
      setImportOpen(true);
    } catch {
      toast({ variant: "destructive", title: "Gagal membaca file", description: "Pastikan file berformat .xlsx sesuai template" });
    }
  }

  async function submitImport() {
    if (!importResult || importResult.rows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/v1/production/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importResult.rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ variant: "success", title: `${json.count} data produksi berhasil diimpor` });
      setImportOpen(false);
      setImportResult(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal impor", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setImporting(false);
    }
  }

  const isOwner = session?.user?.role === "OWNER";

  const watchedDate = form.watch("date");
  const watchedHouse = form.watch("house");
  const watchedMortality = form.watch("mortality");

  const dayName = (() => {
    if (!watchedDate) return "";
    try {
      return format(parseISO(watchedDate), "EEEE", { locale: id });
    } catch {
      return "";
    }
  })();

  // Saat menambah data baru, isi Populasi otomatis = populasi sebelumnya - kematian.
  // Sumber populasi sebelumnya: catatan produksi terakhir untuk kandang itu, atau jika belum ada, data Populasi Saat Ini dari menu Kandang.
  useEffect(() => {
    if (editingId) return;
    if (!watchedHouse) return;
    const kematian = watchedMortality === "" || watchedMortality == null ? 0 : Number(watchedMortality);

    const previousRecord = records
      .filter((r) => r.house.trim().toLowerCase() === watchedHouse.trim().toLowerCase() && r.populasi != null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (previousRecord?.populasi != null) {
      form.setValue("populasi", Math.max(0, previousRecord.populasi - kematian));
      return;
    }

    const house = houses.find((h) => h.name.trim().toLowerCase() === watchedHouse.trim().toLowerCase());
    if (house) {
      form.setValue("populasi", Math.max(0, house.currentPopulation - kematian));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedHouse, watchedMortality, editingId, records, houses]);

  return (
    <>
      <MobileHeader title="Produksi Telur" />
      <div className="px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari kandang..."
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadProductionTemplate(feedProducts)}>
                <Download className="w-4 h-4 mr-2" /> Unduh Template Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Import dari Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {fetching ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🥚</p>
            <p className="text-sm">Belum ada data produksi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => {
              const { hd, feedIntake, fcr, hpp } = computeMetrics(r);
              return (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                        <Badge variant="secondary" className="text-xs">{r.house}</Badge>
                        {r.populasi && <span className="text-xs text-gray-400">{formatNumber(r.populasi)} ekor</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-green-700 font-semibold">{formatNumber(r.goodEggs)} bagus</span>
                        {r.goodEggsKg && <span className="text-green-600 text-xs">({r.goodEggsKg} kg)</span>}
                        {r.crackedEggs > 0 && <span className="text-yellow-600">{r.crackedEggs} retak</span>}
                        {r.rejectedEggs > 0 && <span className="text-red-500">{r.rejectedEggs} BS</span>}
                        {r.mortality && r.mortality > 0 && <span className="text-red-600 text-xs">✝ {r.mortality} mati</span>}
                      </div>
                      {r.feedQtyKg && (
                        <p className="text-xs text-amber-600 mt-1">Pakan: {r.feedQtyKg} kg</p>
                      )}
                      {(hd !== null || feedIntake !== null || fcr !== null || hpp !== null) && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {hd !== null && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">HD {hd.toFixed(1)}%</span>
                          )}
                          {feedIntake !== null && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">FI {feedIntake.toFixed(3)} kg/ekor</span>
                          )}
                          {fcr !== null && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">FCR {fcr.toFixed(5)}</span>
                          )}
                          {hpp !== null && (
                            <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">HPP Rp{formatNumber(Math.round(hpp))}/kg</span>
                          )}
                        </div>
                      )}
                      {r.notes && <p className="text-xs text-gray-400 mt-1 truncate">{r.notes}</p>}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      {isOwner && (
                        <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50 active:bg-red-100">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={openCreate}
        className="fixed right-4 w-14 h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-colors"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingId ? "Edit Produksi" : "Tambah Produksi"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Tanggal
                  {dayName && <span className="text-xs font-normal text-gray-400">({dayName})</span>}
                </Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Kandang</Label>
                {houses.length > 0 ? (
                  <Select onValueChange={(v) => form.setValue("house", v, { shouldValidate: true })} value={watchedHouse}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Pilih kandang" /></SelectTrigger>
                    <SelectContent>
                      {houses.map((h) => (
                        <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Kandang A" className="h-11" {...form.register("house")} />
                )}
                <p className="text-xs text-gray-400">
                  Belum ada di daftar? Tambahkan lewat menu <span className="font-medium">Lainnya &rarr; Kandang</span>
                </p>
                {form.formState.errors.house && (
                  <p className="text-xs text-red-500">{form.formState.errors.house.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telur Bagus (butir)</Label>
                <Input type="number" min="0" className="h-11" {...form.register("goodEggs")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retak (butir)</Label>
                <Input type="number" min="0" className="h-11" {...form.register("crackedEggs")} />
              </div>
            </div>

            <div className="space-y-4 border-t pt-3">
              <p className="text-sm text-gray-500">Detail Lanjutan (Berat, Pakan, Populasi)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bagus (kg)</Label>
                  <Input type="number" min="0" step="0.01" className="h-11" placeholder="0.00" {...form.register("goodEggsKg")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Retak (kg)</Label>
                  <Input type="number" min="0" step="0.01" className="h-11" placeholder="0.00" {...form.register("crackedEggsKg")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Populasi (ekor)</Label>
                  <Input type="number" min="0" className="h-11" placeholder="0" {...form.register("populasi")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kematian (ekor)</Label>
                  <Input type="number" min="0" className="h-11" placeholder="0" {...form.register("mortality")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pakan (kg)</Label>
                  <Input type="number" min="0" step="0.01" className="h-11" placeholder="0.00" {...form.register("feedQtyKg")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Jenis Pakan</Label>
                  <Select onValueChange={(v) => form.setValue("feedProductId", v)} value={form.watch("feedProductId")}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Pilih jenis pakan" /></SelectTrigger>
                    <SelectContent>
                      {feedProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Akan mengurangi Stok Pakan otomatis</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea placeholder="Catatan tambahan..." rows={2} {...form.register("notes")} />
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

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus Data?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Data produksi ini akan dihapus permanen.</p>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportResult(null); }}>
        <DialogContent className="max-w-sm mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pratinjau Import Excel</DialogTitle></DialogHeader>
          {importResult && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-green-700">{importResult.rows.length}</span> baris siap diimpor
                {importResult.errors.length > 0 && (
                  <>
                    {" "}&middot;{" "}
                    <span className="font-semibold text-red-600">{importResult.errors.length}</span> baris dilewati (error)
                  </>
                )}
              </p>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1">
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">Baris {e.rowNum}: {e.message}</p>
                  ))}
                </div>
              )}
              {importResult.rows.length === 0 && (
                <p className="text-sm text-gray-400">Tidak ada baris valid untuk diimpor.</p>
              )}
            </div>
          )}
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(false); setImportResult(null); }}>Batal</Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={submitImport}
              disabled={importing || !importResult || importResult.rows.length === 0}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${importResult?.rows.length ?? 0} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
