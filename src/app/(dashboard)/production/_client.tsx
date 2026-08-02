"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { WorkBook } from "xlsx";
import {
  Plus, Search, Edit2, Trash2, Loader2, X, FileSpreadsheet, Download, Upload, ListFilter,
  ArrowUpDown, ArrowUp, ArrowDown, ListChecks, CheckSquare, Square,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
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

async function exportProductionData(records: EggProduction[], allRecords: EggProduction[]) {
  const XLSX = await import("xlsx");
  const { format: fmtDate, parseISO } = await import("date-fns");

  const headers = [
    "Tanggal", "Hari", "Kandang",
    "Telur Bagus (btr)", "Telur Retak (btr)",
    "Telur Bagus (kg)", "Telur Retak (kg)",
    "Pakan (kg)", "Populasi", "Kematian", "Umur (mgg)",
    "HD (%)", "FI", "FCR",
    "Catatan",
  ];

  const rows = records.map((r) => {
    const { hd, feedIntake, fcr } = computeMetrics(r);
    const umur = r.umurAyam ?? computeUmurSuggestion(r, allRecords);
    const dayName = (() => {
      try { return fmtDate(parseISO(r.date), "EEEE"); } catch { return ""; }
    })();
    return [
      r.date.split("T")[0],
      dayName,
      r.house,
      r.goodEggs,
      r.crackedEggs,
      r.goodEggsKg ?? "",
      r.crackedEggsKg ?? "",
      r.feedQtyKg ?? "",
      r.populasi ?? "",
      r.mortality ?? "",
      umur ?? "",
      hd != null ? Math.round(hd * 100) / 100 : "",
      feedIntake != null ? Math.round(feedIntake * 1000) / 1000 : "",
      fcr != null ? Math.round(fcr * 1000) / 1000 : "",
      r.notes ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produksi");
  const filename = `laporan-produksi-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

async function downloadProductionTemplate(feedProducts: FeedProduct[]) {
  const XLSX = await import("xlsx");
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

function parseImportWorkbook(xlsx: typeof import("xlsx"), workbook: WorkBook, feedProducts: FeedProduct[]): ImportResult {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, unknown>[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });
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
  afkir: z.coerce.number().min(0).optional().or(z.literal("")),
  umurAyam: z.coerce.number().min(0).optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData: EggProduction[];
  houses: House[];
  feedProducts: FeedProduct[];
}

// Given any record with null umurAyam, find the nearest anchor record for the
// same kandang that *does* have umurAyam set, then extrapolate by week diff.
function computeUmurSuggestion(record: EggProduction, allRecords: EggProduction[]): number | null {
  const anchors = allRecords.filter(
    (r) => r.id !== record.id &&
      r.house.trim().toLowerCase() === record.house.trim().toLowerCase() &&
      r.umurAyam != null
  );
  if (anchors.length === 0) return null;

  const recordMs = new Date(record.date).getTime();
  const anchor = anchors.reduce((best, r) => {
    const d = Math.abs(new Date(r.date).getTime() - recordMs);
    const bd = Math.abs(new Date(best.date).getTime() - recordMs);
    return d < bd ? r : best;
  });

  const daysDiff = Math.round((recordMs - new Date(anchor.date).getTime()) / 86400000);
  const weeksDiff = Math.floor(daysDiff / 7);
  return Math.max(0, anchor.umurAyam! + weeksDiff);
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

const TABLE_COLS: { key: string; label: string; align?: "right" }[] = [
  { key: "date",         label: "Tanggal" },
  { key: "house",        label: "Kandang" },
  { key: "goodEggs",     label: "Bagus (btr)", align: "right" },
  { key: "crackedEggs",  label: "Retak (btr)", align: "right" },
  { key: "goodEggsKg",   label: "Bagus (kg)",  align: "right" },
  { key: "crackedEggsKg",label: "Retak (kg)",  align: "right" },
  { key: "feedQtyKg",    label: "Pakan (kg)",  align: "right" },
  { key: "populasi",     label: "Populasi",    align: "right" },
  { key: "mortality",    label: "Mati",        align: "right" },
  { key: "afkir",        label: "Afkir",       align: "right" },
  { key: "umurAyam",     label: "Umur (mgg)",  align: "right" },
  { key: "hd",           label: "HD %",        align: "right" },
  { key: "fi",           label: "FI",          align: "right" },
  { key: "fcr",          label: "FCR",         align: "right" },
];

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-green-600 ml-0.5 inline-block" />
    : <ArrowDown className="w-3 h-3 text-green-600 ml-0.5 inline-block" />;
}

function ProductionTable({
  records, allRecords, sortCol, sortDir, selectMode, selectedIds, isOwner,
  onSort, onToggleSelected, onEdit, onDelete,
}: {
  records: EggProduction[];
  allRecords: EggProduction[];
  sortCol: string;
  sortDir: "asc" | "desc";
  selectMode: boolean;
  selectedIds: string[];
  isOwner: boolean;
  onSort: (col: string) => void;
  onToggleSelected: (id: string) => void;
  onEdit: (r: EggProduction) => void;
  onDelete: (id: string) => void;
}) {
  const thBase = "px-2 py-2 font-semibold text-gray-600 whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 border-b border-gray-200";

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 900 }}>
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
            <th className="px-2 py-2 border-b border-gray-200 w-16" />
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const { hd, feedIntake, fcr } = computeMetrics(r);
            const isSelected = selectedIds.includes(r.id);
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
                <td className="px-2 py-1.5 whitespace-nowrap font-medium text-gray-800">{r.house}</td>
                <td className="px-2 py-1.5 text-right font-mono text-green-700 font-semibold">{formatNumber(r.goodEggs)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-yellow-600">{r.crackedEggs > 0 ? r.crackedEggs : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono">{r.goodEggsKg != null ? r.goodEggsKg : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono">{r.crackedEggsKg != null ? r.crackedEggsKg : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-amber-600">{r.feedQtyKg != null ? r.feedQtyKg : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono">{r.populasi != null ? formatNumber(r.populasi) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-red-500">{r.mortality != null && r.mortality > 0 ? r.mortality : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-orange-500">{r.afkir != null && r.afkir > 0 ? r.afkir : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                  {(() => {
                    const v = r.umurAyam ?? computeUmurSuggestion(r, allRecords);
                    return v != null ? v : <span className="text-gray-300">—</span>;
                  })()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-blue-600">{hd !== null ? hd.toFixed(1) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-amber-700">{feedIntake !== null ? feedIntake.toFixed(3) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-purple-600">{fcr !== null ? fcr.toFixed(3) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 max-w-[100px]">
                  <span className="truncate block text-gray-400">{r.notes ?? ""}</span>
                </td>
                <td className="px-2 py-1.5">
                  {!selectMode && (
                    <div className="flex gap-0.5 justify-end">
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
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [filterHouses, setFilterHouses] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pageSize, setPageSize] = useState<"50" | "100" | "200" | "all">("all");
  const [anchorRecords, setAnchorRecords] = useState<EggProduction[]>(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleFilterHouse(name: string) {
    setFilterHouses((prev) => (prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name]));
  }

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayISO(), house: "", goodEggs: 0, crackedEggs: 0,
      populasi: "", goodEggsKg: "", crackedEggsKg: "",
      feedQtyKg: "", feedProductId: "", mortality: "", umurAyam: "", notes: "",
    },
  });

  const hasActiveFilter = search !== "" || filterHouses.length > 0 || dateFrom !== "" || dateTo !== "";

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterHouses.length > 0) params.set("houses", filterHouses.join(","));
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      // Saat ada filter aktif selalu ambil semua data yang cocok; saat tidak ada
      // filter gunakan pageSize yang dipilih pengguna.
      const limit = hasActiveFilter ? "5000" : pageSize === "all" ? "5000" : pageSize;
      params.set("limit", limit);
      const res = await fetch(`/api/v1/production?${params}`);
      const json = await res.json();
      setRecords(json.data ?? []);
    } finally {
      setFetching(false);
    }
  }, [search, filterHouses, dateFrom, dateTo, hasActiveFilter, pageSize]);

  async function fetchAnchorData() {
    try {
      const res = await fetch("/api/v1/production?limit=5000");
      const json = await res.json();
      setAnchorRecords(json.data ?? []);
    } catch { /* non-critical, keep existing anchors */ }
  }

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
  }, [search, filterHouses, dateFrom, dateTo, pageSize]);

  const displayRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let av: number | string | null = null;
      let bv: number | string | null = null;
      if (sortCol === "date") { av = a.date; bv = b.date; }
      else if (sortCol === "house") { av = a.house; bv = b.house; }
      else if (sortCol === "goodEggs") { av = a.goodEggs; bv = b.goodEggs; }
      else if (sortCol === "crackedEggs") { av = a.crackedEggs; bv = b.crackedEggs; }
      else if (sortCol === "goodEggsKg") { av = a.goodEggsKg ?? null; bv = b.goodEggsKg ?? null; }
      else if (sortCol === "crackedEggsKg") { av = a.crackedEggsKg ?? null; bv = b.crackedEggsKg ?? null; }
      else if (sortCol === "feedQtyKg") { av = a.feedQtyKg ?? null; bv = b.feedQtyKg ?? null; }
      else if (sortCol === "populasi") { av = a.populasi ?? null; bv = b.populasi ?? null; }
      else if (sortCol === "mortality") { av = a.mortality ?? null; bv = b.mortality ?? null; }
      else if (sortCol === "umurAyam") { av = a.umurAyam ?? null; bv = b.umurAyam ?? null; }
      else if (sortCol === "hd") { av = computeMetrics(a).hd; bv = computeMetrics(b).hd; }
      else if (sortCol === "fi") { av = computeMetrics(a).feedIntake; bv = computeMetrics(b).feedIntake; }
      else if (sortCol === "fcr") { av = computeMetrics(a).fcr; bv = computeMetrics(b).fcr; }
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [records, sortCol, sortDir]);

  const defaultValues = {
    date: todayISO(), house: "", goodEggs: 0, crackedEggs: 0,
    populasi: "" as const, goodEggsKg: "" as const, crackedEggsKg: "" as const,
    feedQtyKg: "" as const, feedProductId: "" as const,
    mortality: "" as const, afkir: "" as const, umurAyam: "" as const, notes: "",
  };

  // Tracks the last value written by the umurAyam auto-fill effect so we can
  // tell whether a subsequent change to the field was manual (user typed) or
  // still the auto-filled recommendation.
  const umurAutoFilled = useRef<number | "">("");

  function openCreate() {
    form.reset(defaultValues);
    umurAutoFilled.current = "";
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(record: EggProduction) {
    const umurValue = record.umurAyam ?? computeUmurSuggestion(record, records) ?? "";
    umurAutoFilled.current = umurValue === "" ? "" : (umurValue as number);
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
      afkir: record.afkir ?? "",
      umurAyam: umurValue,
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
        afkir: data.afkir !== "" ? data.afkir : null,
        umurAyam: data.umurAyam !== "" ? data.umurAyam : null,
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
      fetchAnchorData();
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
      fetchAnchorData();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
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
      const res = await fetch("/api/v1/production/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ variant: "success", title: `${json.count} data produksi dihapus` });
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      setSelectMode(false);
      fetchData();
      fetchAnchorData();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buf, { type: "array", cellDates: true });
      const result = parseImportWorkbook(XLSX, workbook, feedProducts);
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
    const IMPORT_CHUNK_SIZE = 150;
    const total = importResult.rows.length;
    setImporting(true);
    setImportProgress({ done: 0, total });
    let imported = 0;
    try {
      for (let i = 0; i < total; i += IMPORT_CHUNK_SIZE) {
        const chunk = importResult.rows.slice(i, i + IMPORT_CHUNK_SIZE);
        const res = await fetch("/api/v1/production/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        imported += json.count ?? chunk.length;
        setImportProgress({ done: Math.min(i + chunk.length, total), total });
      }

      toast({ variant: "success", title: `${imported} data produksi berhasil diimpor` });
      setImportOpen(false);
      setImportResult(null);
      fetchData();
      fetchAnchorData();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Gagal impor",
        description: imported > 0
          ? `${imported} dari ${total} baris berhasil diimpor sebelum terhenti: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`
          : err instanceof Error ? err.message : "Terjadi kesalahan",
      });
      if (imported > 0) fetchData();
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  const isOwner = (session?.user?.role === "OWNER" || session?.user?.role === "DEVELOPER");

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

    const previousRecord = anchorRecords
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
  }, [watchedHouse, watchedMortality, editingId, anchorRecords, houses]);

  // Auto-isi Umur Ayam = umur ayam catatan sebelumnya + selisih minggu (1 minggu = 7 hari).
  // Only fills when the field is empty or still holds the last auto-suggested value,
  // so a manual edit by the user is never overwritten.
  useEffect(() => {
    if (editingId) return;
    if (!watchedHouse || !watchedDate) return;

    const previousRecord = anchorRecords
      .filter((r) => r.house.trim().toLowerCase() === watchedHouse.trim().toLowerCase() && r.umurAyam != null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (previousRecord?.umurAyam != null) {
      const daysDiff = Math.round(
        (new Date(watchedDate).getTime() - new Date(previousRecord.date).getTime()) / 86400000
      );
      const weeksDiff = Math.floor(daysDiff / 7);
      const suggested = Math.max(0, previousRecord.umurAyam + weeksDiff);
      const current = form.getValues("umurAyam");
      // Only write if the field is empty or still equals the last auto-fill value.
      if (current === "" || current === umurAutoFilled.current) {
        form.setValue("umurAyam", suggested);
        umurAutoFilled.current = suggested;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedHouse, watchedDate, editingId, anchorRecords]);

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
              {isOwner && (
                <DropdownMenuItem onClick={() => exportProductionData(displayRecords, records)}>
                  <Download className="w-4 h-4 mr-2" /> Export Excel
                </DropdownMenuItem>
              )}
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

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <ListFilter className="w-3.5 h-3.5" />
                {filterHouses.length === 0
                  ? "Semua Kandang"
                  : filterHouses.length === 1
                    ? filterHouses[0]
                    : `${filterHouses.length} Kandang`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter Kandang</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {houses.map((h) => (
                <DropdownMenuCheckboxItem
                  key={h.id}
                  checked={filterHouses.includes(h.name)}
                  onCheckedChange={() => toggleFilterHouse(h.name)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {h.name}
                </DropdownMenuCheckboxItem>
              ))}
              {filterHouses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setFilterHouses([])}>Reset filter kandang</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
            <p className="text-4xl mb-2">🥚</p>
            <p className="text-sm">Belum ada data produksi</p>
          </div>
        ) : displayRecords.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm">Tidak ada data yang cocok dengan filter</p>
          </div>
        ) : (
          <ProductionTable
            records={displayRecords}
            allRecords={anchorRecords}
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
          className="fixed right-4 w-14 h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-colors"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

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
                <div className="space-y-1.5">
                  <Label className="text-xs">Afkir (ekor)</Label>
                  <Input type="number" min="0" className="h-11" placeholder="0" {...form.register("afkir")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Umur Ayam (mgg)</Label>
                  <Input type="number" min="0" className="h-11" placeholder="0" {...form.register("umurAyam")} />
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

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus {selectedIds.length} Data?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">
            {selectedIds.length} catatan produksi yang dipilih akan dihapus permanen, beserta catatan Pemakaian Pakan otomatis yang terhubung.
          </p>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Hapus ${selectedIds.length} Data`}
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
              {importProgress && (
                <div className="space-y-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-right">
                    {importProgress.done} / {importProgress.total} baris diimpor
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(false); setImportResult(null); }} disabled={importing}>Batal</Button>
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
