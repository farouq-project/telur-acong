"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Edit2, Trash2, Loader2, ShoppingBag, ShoppingCart, Archive, ClipboardList,
  ArrowUpDown, ArrowUp, ArrowDown, ListChecks, CheckSquare, Square, ListFilter,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, formatRupiah, todayISO } from "@/lib/utils";
import type { FeedProduct, FeedPurchase, FeedUsage, FeedSale, FeedStockDay } from "@/types";

const purchaseSchema = z.object({
  date: z.string().min(1),
  feedProductId: z.string().min(1, "Pilih produk pakan"),
  qty: z.coerce.number().min(0.01),
  pricePerKg: z.coerce.number().min(0).optional().or(z.literal("")),
  notes: z.string().optional(),
});

const saleSchema = z.object({
  date: z.string().min(1),
  customerName: z.string().min(1),
  feedProductId: z.string().min(1),
  qty: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(1),
});

const productSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  unit: z.string().min(1),
});

const stockOpnameSchema = z.object({
  date: z.string().min(1),
  feedProductId: z.string().min(1, "Pilih produk pakan"),
  qtyKg: z.coerce.number().min(0),
});

type PurchaseForm = z.infer<typeof purchaseSchema>;
type SaleForm = z.infer<typeof saleSchema>;
type ProductForm = z.infer<typeof productSchema>;
type StockOpnameForm = z.infer<typeof stockOpnameSchema>;

interface Props {
  initialProducts: FeedProduct[];
  initialPurchases: FeedPurchase[];
  initialUsages: FeedUsage[];
  initialFeedSales: FeedSale[];
}

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-green-600 ml-0.5 inline-block" />
    : <ArrowDown className="w-3 h-3 text-green-600 ml-0.5 inline-block" />;
}

function Th({ col, label, align, sortCol, sortDir, onSort }: {
  col: string; label: string; align?: "right"; sortCol: string; sortDir: "asc" | "desc"; onSort: (col: string) => void;
}) {
  return (
    <th
      className={`px-2 py-2 font-semibold text-gray-600 whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 active:bg-gray-200 border-b border-gray-200 ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );
}

function SelectCell({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <td className="px-2 py-1.5 text-center" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      {checked
        ? <CheckSquare className="w-4 h-4 text-green-600 inline" />
        : <Square className="w-4 h-4 text-gray-300 inline" />}
    </td>
  );
}

function PurchaseTable({
  records, sortCol, sortDir, selectMode, selectedIds, isOwner,
  onSort, onToggleSelected, onEdit, onDelete,
}: {
  records: FeedPurchase[]; sortCol: string; sortDir: "asc" | "desc"; selectMode: boolean; selectedIds: string[]; isOwner: boolean;
  onSort: (col: string) => void; onToggleSelected: (id: string) => void; onEdit: (r: FeedPurchase) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 640 }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {selectMode && <th className="w-8 px-2 py-2 border-b border-gray-200" />}
            <Th col="date" label="Tanggal" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="product" label="Produk" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="qty" label="Jumlah" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="pricePerKg" label="Harga/kg" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="totalValue" label="Total" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <th className="px-2 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">Catatan</th>
            <th className="px-2 py-2 border-b border-gray-200 w-16" />
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const isSelected = selectedIds.includes(r.id);
            const rowCls = [
              idx % 2 === 1 ? "bg-gray-50/60" : "bg-white",
              isSelected ? "!bg-green-50" : "",
              selectMode ? "cursor-pointer" : "",
              "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
            ].join(" ");
            return (
              <tr key={r.id} className={rowCls} onClick={selectMode ? () => onToggleSelected(r.id) : undefined}>
                {selectMode && <SelectCell checked={isSelected} onToggle={() => onToggleSelected(r.id)} />}
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-medium text-gray-800">{(r.feedProduct as FeedProduct)?.name ?? ""}</td>
                <td className="px-2 py-1.5 text-right font-mono">{formatNumber(r.qty)} {(r.feedProduct as FeedProduct)?.unit ?? "kg"}</td>
                <td className="px-2 py-1.5 text-right font-mono">{r.pricePerKg != null ? formatRupiah(r.pricePerKg) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 text-right font-mono text-green-700 font-semibold">{r.totalValue != null ? formatRupiah(r.totalValue) : <span className="text-gray-300">—</span>}</td>
                <td className="px-2 py-1.5 max-w-[100px]"><span className="truncate block text-gray-400">{r.notes ?? ""}</span></td>
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
      <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">{records.length} baris</div>
    </div>
  );
}

function UsageTable({ records, sortCol, sortDir, onSort }: {
  records: FeedUsage[]; sortCol: string; sortDir: "asc" | "desc"; onSort: (col: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 700 }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <Th col="date" label="Tanggal" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="house" label="Kandang" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="product" label="Produk" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="qtyUsed" label="Jumlah" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="unitCost" label="Biaya/kg" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="totalCost" label="Total Biaya" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <th className="px-2 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => (
            <tr key={r.id} className={`${idx % 2 === 1 ? "bg-gray-50/60" : "bg-white"} border-b border-gray-100`}>
              <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
              <td className="px-2 py-1.5 whitespace-nowrap font-medium text-gray-800">{r.house}</td>
              <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{(r.feedProduct as FeedProduct)?.name ?? ""}</td>
              <td className="px-2 py-1.5 text-right font-mono text-amber-600">{formatNumber(r.qtyUsed)} {(r.feedProduct as FeedProduct)?.unit ?? "kg"}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.unitCost != null ? formatRupiah(r.unitCost) : <span className="text-gray-300">—</span>}</td>
              <td className="px-2 py-1.5 text-right font-mono text-amber-700 font-semibold">{r.totalCost != null ? formatRupiah(r.totalCost) : <span className="text-gray-300">—</span>}</td>
              <td className="px-2 py-1.5 max-w-[100px]"><span className="truncate block text-gray-400">{r.notes ?? ""}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">{records.length} baris</div>
    </div>
  );
}

function SaleTable({
  records, sortCol, sortDir, selectMode, selectedIds, isOwner,
  onSort, onToggleSelected, onEdit, onDelete,
}: {
  records: FeedSale[]; sortCol: string; sortDir: "asc" | "desc"; selectMode: boolean; selectedIds: string[]; isOwner: boolean;
  onSort: (col: string) => void; onToggleSelected: (id: string) => void; onEdit: (r: FeedSale) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 700 }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {selectMode && <th className="w-8 px-2 py-2 border-b border-gray-200" />}
            <Th col="date" label="Tanggal" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="customerName" label="Pelanggan" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="product" label="Produk" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="qty" label="Jumlah" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="unitPrice" label="Harga" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="totalValue" label="Total" align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <th className="px-2 py-2 border-b border-gray-200 w-16" />
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const isSelected = selectedIds.includes(r.id);
            const rowCls = [
              idx % 2 === 1 ? "bg-gray-50/60" : "bg-white",
              isSelected ? "!bg-green-50" : "",
              selectMode ? "cursor-pointer" : "",
              "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
            ].join(" ");
            return (
              <tr key={r.id} className={rowCls} onClick={selectMode ? () => onToggleSelected(r.id) : undefined}>
                {selectMode && <SelectCell checked={isSelected} onToggle={() => onToggleSelected(r.id)} />}
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-medium text-gray-800">{r.customerName}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{(r.feedProduct as FeedProduct)?.name ?? ""}</td>
                <td className="px-2 py-1.5 text-right font-mono">{formatNumber(r.qty)} {(r.feedProduct as FeedProduct)?.unit ?? "kg"}</td>
                <td className="px-2 py-1.5 text-right font-mono">{formatRupiah(r.unitPrice)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-purple-600 font-semibold">{formatRupiah(r.totalValue)}</td>
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
      <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">{records.length} baris</div>
    </div>
  );
}

function StockTable({ records, sortCol, sortDir, onSort, unit }: {
  records: FeedStockDay[]; sortCol: string; sortDir: "asc" | "desc"; onSort: (col: string) => void; unit: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-[11px]" style={{ minWidth: 760 }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <Th col="date" label="Tanggal" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="beliKg" label={`Total Beli (${unit})`} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="pakaiKg" label={`Total Pemakaian (${unit})`} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="jualKg" label={`Total Jual (${unit})`} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="sisaStokKg" label={`Sisa Stok (${unit})`} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            <Th col="sisaStokRealKg" label={`Sisa Stok Real (${unit})`} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => (
            <tr key={r.date} className={`${idx % 2 === 1 ? "bg-gray-50/60" : "bg-white"} border-b border-gray-100`}>
              <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
              <td className="px-2 py-1.5 text-right font-mono text-green-700">{formatNumber(r.beliKg)}</td>
              <td className="px-2 py-1.5 text-right font-mono text-amber-600">{formatNumber(r.pakaiKg)}</td>
              <td className="px-2 py-1.5 text-right font-mono text-purple-600">{formatNumber(r.jualKg)}</td>
              <td className="px-2 py-1.5 text-right font-mono font-semibold text-gray-800">{formatNumber(r.sisaStokKg)}</td>
              <td className="px-2 py-1.5 text-right font-mono">{r.sisaStokRealKg != null ? formatNumber(r.sisaStokRealKg) : <span className="text-gray-300">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">{records.length} baris</div>
    </div>
  );
}

export default function FeedClient({ initialProducts, initialPurchases, initialUsages, initialFeedSales }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [products, setProducts] = useState<FeedProduct[]>(initialProducts);
  const [purchases, setPurchases] = useState<FeedPurchase[]>(initialPurchases);
  const [usages, setUsages] = useState<FeedUsage[]>(initialUsages);
  const [feedSales, setFeedSales] = useState<FeedSale[]>(initialFeedSales);
  const [fetching, setFetching] = useState(false);
  const [activeSheet, setActiveSheet] = useState<"purchase" | "sale" | "product" | "stockOpname" | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"purchases" | "usage" | "sales" | "products" | "stock">("purchases");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState<"50" | "100" | "200" | "all">("50");
  const [filterHouses, setFilterHouses] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleting2Open] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [stockProductId, setStockProductId] = useState("");
  const [stockData, setStockData] = useState<FeedStockDay[]>([]);
  const [stockFetching, setStockFetching] = useState(false);

  const purchaseForm = useForm<PurchaseForm>({ resolver: zodResolver(purchaseSchema), defaultValues: { date: todayISO(), feedProductId: "", qty: 0, pricePerKg: "", notes: "" } });
  const saleForm = useForm<SaleForm>({ resolver: zodResolver(saleSchema), defaultValues: { date: todayISO(), customerName: "", feedProductId: "", qty: 0, unitPrice: 0 } });
  const productForm = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: { name: "", unit: "kg" } });
  const stockOpnameForm = useForm<StockOpnameForm>({ resolver: zodResolver(stockOpnameSchema), defaultValues: { date: todayISO(), feedProductId: "", qtyKg: 0 } });

  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const limit = pageSize === "all" ? "5000" : pageSize;
      params.set("limit", limit);
      const [p, pu, u, s] = await Promise.all([
        fetch("/api/v1/feed-products").then((r) => r.json()),
        fetch(`/api/v1/feed-purchases?${params}`).then((r) => r.json()),
        fetch(`/api/v1/feed-usage?${params}`).then((r) => r.json()),
        fetch(`/api/v1/feed-sales?${params}`).then((r) => r.json()),
      ]);
      setProducts(p.data ?? []);
      setPurchases(pu.data ?? []);
      setUsages(u.data ?? []);
      setFeedSales(s.data ?? []);
    } finally {
      setFetching(false);
    }
  }, [dateFrom, dateTo, pageSize]);

  const isFirstFetch = useRef(true);
  useEffect(() => {
    // initialData from SSR already matches the default filters/pageSize, so
    // skip the redundant refetch on first mount.
    if (isFirstFetch.current) {
      isFirstFetch.current = false;
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, pageSize]);

  useEffect(() => {
    if (!stockProductId && products.length > 0) setStockProductId(products[0].id);
  }, [products, stockProductId]);

  const fetchStockData = useCallback(async () => {
    if (!stockProductId) return;
    setStockFetching(true);
    try {
      const params = new URLSearchParams({ feedProductId: stockProductId });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const json = await fetch(`/api/v1/feed-stock?${params}`).then((r) => r.json());
      setStockData(json.data ?? []);
    } finally {
      setStockFetching(false);
    }
  }, [stockProductId, dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === "stock") fetchStockData();
  }, [activeTab, fetchStockData]);

  function toggleFilterHouse(name: string) {
    setFilterHouses((prev) => (prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name]));
  }

  function changeTab(tab: "purchases" | "usage" | "sales" | "products" | "stock") {
    setActiveTab(tab);
    setSortCol("date");
    setSortDir("desc");
    setSelectMode(false);
    setSelectedIds([]);
  }

  function handleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  function sortByCol<T>(records: T[], getValue: (r: T, col: string) => number | string | null): T[] {
    return [...records].sort((a, b) => {
      const av = getValue(a, sortCol);
      const bv = getValue(b, sortCol);
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }

  const displayPurchases = useMemo(() => sortByCol(purchases, (r, col) => {
    switch (col) {
      case "date": return r.date;
      case "product": return (r.feedProduct as FeedProduct)?.name ?? "";
      case "qty": return r.qty;
      case "pricePerKg": return r.pricePerKg ?? null;
      case "totalValue": return r.totalValue ?? null;
      default: return r.date;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [purchases, sortCol, sortDir]);

  const houseOptions = useMemo(() => Array.from(new Set(usages.map((u) => u.house))).sort(), [usages]);

  const displayUsages = useMemo(() => {
    const filtered = filterHouses.length > 0 ? usages.filter((u) => filterHouses.includes(u.house)) : usages;
    return sortByCol(filtered, (r, col) => {
      switch (col) {
        case "date": return r.date;
        case "house": return r.house;
        case "product": return (r.feedProduct as FeedProduct)?.name ?? "";
        case "qtyUsed": return r.qtyUsed;
        case "unitCost": return r.unitCost ?? null;
        case "totalCost": return r.totalCost ?? null;
        default: return r.date;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usages, filterHouses, sortCol, sortDir]);

  const displaySales = useMemo(() => sortByCol(feedSales, (r, col) => {
    switch (col) {
      case "date": return r.date;
      case "customerName": return r.customerName;
      case "product": return (r.feedProduct as FeedProduct)?.name ?? "";
      case "qty": return r.qty;
      case "unitPrice": return r.unitPrice;
      case "totalValue": return r.totalValue;
      default: return r.date;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [feedSales, sortCol, sortDir]);

  const displayStock = useMemo(() => sortByCol(stockData, (r, col) => {
    switch (col) {
      case "date": return r.date;
      case "beliKg": return r.beliKg;
      case "pakaiKg": return r.pakaiKg;
      case "jualKg": return r.jualKg;
      case "sisaStokKg": return r.sisaStokKg;
      case "sisaStokRealKg": return r.sisaStokRealKg;
      default: return r.date;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stockData, sortCol, sortDir]);

  const visibleIds = activeTab === "purchases" ? displayPurchases.map((r) => r.id)
    : activeTab === "sales" ? displaySales.map((r) => r.id)
    : [];

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
    setSelectedIds((prev) => (prev.length === visibleIds.length ? [] : visibleIds));
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const endpoint = activeTab === "purchases" ? "/api/v1/feed-purchases/bulk-delete" : "/api/v1/feed-sales/bulk-delete";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ variant: "success", title: `${json.count} data dihapus` });
      setBulkDeleting2Open(false);
      setSelectedIds([]);
      setSelectMode(false);
      fetchAll();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function submitPurchase(data: PurchaseForm) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/feed-purchases/${editingId}` : "/api/v1/feed-purchases";
      const payload = { ...data, pricePerKg: data.pricePerKg !== "" ? data.pricePerKg : null };
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Pembelian disimpan" });
      setActiveSheet(null);
      fetchAll();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function submitSale(data: SaleForm) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/feed-sales/${editingId}` : "/api/v1/feed-sales";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Penjualan disimpan" });
      setActiveSheet(null);
      fetchAll();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function submitProduct(data: ProductForm) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/feed-products/${editingId}` : "/api/v1/feed-products";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Produk disimpan" });
      setActiveSheet(null);
      fetchAll();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function submitStockOpname(data: StockOpnameForm) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/feed-stock-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Stok real disimpan" });
      setActiveSheet(null);
      if (activeTab === "stock" && data.feedProductId === stockProductId) fetchStockData();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const endpoints: Record<string, string> = {
      purchase: `/api/v1/feed-purchases/${deleteTarget.id}`,
      sale: `/api/v1/feed-sales/${deleteTarget.id}`,
      product: `/api/v1/feed-products/${deleteTarget.id}`,
    };
    await fetch(endpoints[deleteTarget.type], { method: "DELETE" });
    toast({ variant: "success", title: "Dihapus" });
    setDeleteTarget(null);
    fetchAll();
  }

  const isOwner = (session?.user?.role === "OWNER" || session?.user?.role === "DEVELOPER");

  function openPurchase(record?: FeedPurchase) {
    purchaseForm.reset(record ? { date: record.date.split("T")[0], feedProductId: record.feedProductId, qty: record.qty, pricePerKg: record.pricePerKg ?? "", notes: record.notes ?? "" } : { date: todayISO(), feedProductId: "", qty: 0, pricePerKg: "", notes: "" });
    setEditingId(record?.id ?? null);
    setActiveSheet("purchase");
  }

  function openSale(record?: FeedSale) {
    saleForm.reset(record ? { date: record.date.split("T")[0], customerName: record.customerName, feedProductId: record.feedProductId, qty: record.qty, unitPrice: record.unitPrice } : { date: todayISO(), customerName: "", feedProductId: "", qty: 0, unitPrice: 0 });
    setEditingId(record?.id ?? null);
    setActiveSheet("sale");
  }

  function openProduct(record?: FeedProduct) {
    productForm.reset(record ? { name: record.name, unit: record.unit } : { name: "", unit: "kg" });
    setEditingId(record?.id ?? null);
    setActiveSheet("product");
  }

  function openStockOpname() {
    stockOpnameForm.reset({ date: todayISO(), feedProductId: stockProductId || "", qtyKg: 0 });
    setEditingId(null);
    setActiveSheet("stockOpname");
  }

  return (
    <>
      <MobileHeader title="Manajemen Pakan" />
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={(v) => changeTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-5 w-full mb-3">
            <TabsTrigger value="purchases" className="text-xs">Beli</TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">Pakai</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs">Jual</TabsTrigger>
            <TabsTrigger value="products" className="text-xs">Produk</TabsTrigger>
            <TabsTrigger value="stock" className="text-xs">Stok Pakan</TabsTrigger>
          </TabsList>

          {(activeTab === "purchases" || activeTab === "usage" || activeTab === "sales" || activeTab === "stock") && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {activeTab === "stock" && (
                <Select value={stockProductId} onValueChange={setStockProductId}>
                  <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {activeTab === "usage" && (
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
                    {houseOptions.map((h) => (
                      <DropdownMenuCheckboxItem
                        key={h}
                        checked={filterHouses.includes(h)}
                        onCheckedChange={() => toggleFilterHouse(h)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {h}
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
              )}

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

              {activeTab !== "stock" && (
                <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden shrink-0 ml-auto">
                  {(["50", "100", "200", "all"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPageSize(v)}
                      className={`px-2 h-9 text-xs font-medium transition-colors ${
                        pageSize === v ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {v === "all" ? "Semua" : v}
                    </button>
                  ))}
                </div>
              )}

              {isOwner && (activeTab === "purchases" || activeTab === "sales") && (
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
          )}

          {selectMode && (
            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2 mb-3">
              <button onClick={selectAllVisible} className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                {selectedIds.length > 0 && selectedIds.length === visibleIds.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Pilih semua ({visibleIds.length})
              </button>
              <span className="text-xs text-green-700">{selectedIds.length} dipilih</span>
            </div>
          )}

          <TabsContent value="purchases" className="space-y-2">
            {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              displayPurchases.length === 0 ? <Empty label="Belum ada pembelian pakan" /> :
              <PurchaseTable
                records={displayPurchases}
                sortCol={sortCol}
                sortDir={sortDir}
                selectMode={selectMode}
                selectedIds={selectedIds}
                isOwner={isOwner}
                onSort={handleSort}
                onToggleSelected={toggleSelected}
                onEdit={openPurchase}
                onDelete={(id) => setDeleteTarget({ id, type: "purchase" })}
              />
            }
          </TabsContent>

          <TabsContent value="usage" className="space-y-2">
            <p className="text-xs text-gray-400 px-1">Pemakaian terisi otomatis dari catatan Produksi Telur — tab ini hanya untuk pemantauan.</p>
            {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              displayUsages.length === 0 ? <Empty label="Belum ada pemakaian pakan" /> :
              <UsageTable records={displayUsages} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            }
          </TabsContent>

          <TabsContent value="sales" className="space-y-2">
            {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              displaySales.length === 0 ? <Empty label="Belum ada penjualan pakan" /> :
              <SaleTable
                records={displaySales}
                sortCol={sortCol}
                sortDir={sortDir}
                selectMode={selectMode}
                selectedIds={selectedIds}
                isOwner={isOwner}
                onSort={handleSort}
                onToggleSelected={toggleSelected}
                onEdit={openSale}
                onDelete={(id) => setDeleteTarget({ id, type: "sale" })}
              />
            }
          </TabsContent>

          <TabsContent value="products" className="space-y-2">
            {products.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.unit}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openProduct(r)} className="p-2 rounded-lg hover:bg-gray-100"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                  {isOwner && <button onClick={() => setDeleteTarget({ id: r.id, type: "product" })} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>}
                </div>
              </div>
            ))}
            <AddButton onClick={() => openProduct()} label="Tambah Produk" />
          </TabsContent>

          <TabsContent value="stock" className="space-y-2">
            {!stockProductId ? <Empty label="Belum ada produk pakan" /> :
              stockFetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              displayStock.length === 0 ? <Empty label="Belum ada data stok pakan" /> :
              <StockTable
                records={displayStock}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
                unit={products.find((p) => p.id === stockProductId)?.unit ?? "kg"}
              />
            }
          </TabsContent>
        </Tabs>
      </div>

      {selectMode && selectedIds.length > 0 ? (
        <div
          className="fixed left-0 right-0 z-30 px-4 flex justify-center"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-3 flex items-center gap-3 max-w-md w-full">
            <span className="text-sm text-gray-600 flex-1">{selectedIds.length} data dipilih</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>Batal</Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleting2Open(true)} className="gap-1.5">
              <Trash2 className="w-4 h-4" /> Hapus
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setChooserOpen(true)}
          className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center justify-center transition-colors"
          aria-label="Tambah catatan pakan"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <Sheet open={chooserOpen} onOpenChange={setChooserOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-2"><SheetTitle>Tambah Catatan Pakan</SheetTitle></SheetHeader>
          <p className="text-xs text-gray-400 mb-4">Pilih jenis catatan yang ingin ditambahkan</p>
          <div className="space-y-2 pb-4">
            <ChooserOption
              icon={<ShoppingBag className="w-5 h-5" />}
              accent="green"
              title="Pembelian"
              description="Catat pakan masuk dari pembelian"
              onClick={() => { setChooserOpen(false); openPurchase(); }}
            />
            <ChooserOption
              icon={<ShoppingCart className="w-5 h-5" />}
              accent="purple"
              title="Penjualan"
              description="Catat pakan yang terjual ke pelanggan"
              onClick={() => { setChooserOpen(false); openSale(); }}
            />
            <ChooserOption
              icon={<ClipboardList className="w-5 h-5" />}
              accent="amber"
              title="Stok Real"
              description="Catat hasil stok opname pakan per hari"
              onClick={() => { setChooserOpen(false); openStockOpname(); }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === "purchase"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>{editingId ? "Edit Pembelian" : "Beli Pakan"}</SheetTitle></SheetHeader>
          <form onSubmit={purchaseForm.handleSubmit(submitPurchase)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" className="h-11" {...purchaseForm.register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Produk Pakan</Label>
              <Select onValueChange={(v) => purchaseForm.setValue("feedProductId", v)} value={purchaseForm.watch("feedProductId")}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jumlah</Label>
                <Input type="number" step="0.01" className="h-11" {...purchaseForm.register("qty")} />
              </div>
              <div className="space-y-1.5">
                <Label>Harga per kg (Rp)</Label>
                <Input type="number" step="0.01" min="0" className="h-11" placeholder="0" {...purchaseForm.register("pricePerKg")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea rows={2} {...purchaseForm.register("notes")} />
            </div>
            <FormActions submitting={submitting} onCancel={() => setActiveSheet(null)} editingId={editingId} />
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === "sale"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>{editingId ? "Edit Penjualan Pakan" : "Jual Pakan"}</SheetTitle></SheetHeader>
          <form onSubmit={saleForm.handleSubmit(submitSale)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" className="h-11" {...saleForm.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Pelanggan</Label>
                <Input className="h-11" {...saleForm.register("customerName")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Produk</Label>
              <Select onValueChange={(v) => saleForm.setValue("feedProductId", v)} value={saleForm.watch("feedProductId")}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Jumlah</Label>
                <Input type="number" step="0.01" className="h-11" {...saleForm.register("qty")} />
              </div>
              <div className="space-y-1.5">
                <Label>Harga</Label>
                <Input type="number" className="h-11" {...saleForm.register("unitPrice")} />
              </div>
            </div>
            <FormActions submitting={submitting} onCancel={() => setActiveSheet(null)} editingId={editingId} />
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === "product"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>{editingId ? "Edit Produk" : "Tambah Produk Pakan"}</SheetTitle></SheetHeader>
          <form onSubmit={productForm.handleSubmit(submitProduct)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Produk</Label>
              <Input className="h-11" placeholder="Pakan Layer A" {...productForm.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Satuan</Label>
              <Input className="h-11" placeholder="kg" {...productForm.register("unit")} />
            </div>
            <FormActions submitting={submitting} onCancel={() => setActiveSheet(null)} editingId={editingId} />
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === "stockOpname"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>Stok Real Pakan</SheetTitle></SheetHeader>
          <form onSubmit={stockOpnameForm.handleSubmit(submitStockOpname)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" className="h-11" {...stockOpnameForm.register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Produk Pakan</Label>
              <Select onValueChange={(v) => stockOpnameForm.setValue("feedProductId", v)} value={stockOpnameForm.watch("feedProductId")}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sisa Stok Real (kg)</Label>
              <Input type="number" step="0.01" min="0" className="h-11" {...stockOpnameForm.register("qtyKg")} />
            </div>
            <FormActions submitting={submitting} onCancel={() => setActiveSheet(null)} editingId={null} />
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus Data?</DialogTitle></DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleting2Open}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus {selectedIds.length} Data?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">{selectedIds.length} data yang dipilih akan dihapus permanen.</p>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkDeleting2Open(false)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Hapus ${selectedIds.length} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "bg-green-50", text: "text-green-700", border: "border-l-green-400" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-l-amber-400" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-l-purple-400" },
};

function Empty({ label }: { label: string }) {
  return <div className="text-center py-12 text-gray-400 text-sm">{label}</div>;
}

function AddButton({ onClick, label = "Tambah" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="w-full mt-2 h-12 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 flex items-center justify-center gap-2 transition-colors">
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

function ChooserOption({ icon, accent, title, description, onClick }: {
  icon: React.ReactNode; accent: "green" | "amber" | "purple";
  title: string; description: string; onClick: () => void;
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left"
    >
      <div className={`w-11 h-11 rounded-xl ${a.bg} ${a.text} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </button>
  );
}

function FormActions({ submitting, onCancel, editingId }: { submitting: boolean; onCancel: () => void; editingId: string | null }) {
  return (
    <div className="flex gap-3 pt-2 pb-4">
      <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel}>Batal</Button>
      <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Simpan" : "Tambah"}
      </Button>
    </div>
  );
}
