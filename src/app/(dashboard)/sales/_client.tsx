"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, parseISO } from "date-fns";
import { Plus, Search, Edit2, Trash2, Loader2, X, FileText, Printer } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, formatRupiah, todayISO } from "@/lib/utils";
import type { EggSale } from "@/types";

const schema = z.object({
  date: z.string().min(1),
  customerName: z.string().min(1, "Nama pelanggan wajib diisi"),
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

function InvoiceView({ sale }: { sale: EggSale }) {
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
        <h2 className="text-lg font-bold text-gray-800">INVOICE</h2>
        <p className="text-xs text-gray-400 subtitle">Telur Acong — Peternakan Ayam Petelur</p>
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

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), customerName: "", qtySold: 1, unitPrice: 0, jatuhTempoDays: "", notes: "" },
  });

  const watchQty = form.watch("qtySold");
  const watchPrice = form.watch("unitPrice");
  useEffect(() => {
    setTotalValue((watchQty ?? 0) * (watchPrice ?? 0));
  }, [watchQty, watchPrice]);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/sales?${params}`);
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

  function openCreate() {
    form.reset({ date: todayISO(), customerName: "", qtySold: 1, unitPrice: 0, jatuhTempoDays: "", notes: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(record: EggSale) {
    form.reset({
      date: record.date.split("T")[0],
      customerName: record.customerName,
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
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const isOwner = session?.user?.role === "OWNER";

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

        {fetching ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🛒</p>
            <p className="text-sm">Belum ada data penjualan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    <p className="font-medium text-gray-800 text-sm">{r.customerName}</p>
                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{formatNumber(r.qtySold)} kg</span>
                      <span>×</span>
                      <span>{formatRupiah(r.unitPrice)}/kg</span>
                    </div>
                    <p className="text-sm font-semibold text-purple-600 mt-1">{formatRupiah(r.totalValue)}</p>
                    {r.jatuhTempoDays != null && (() => {
                      const d = dueDate(r.date, r.jatuhTempoDays);
                      return d ? (
                        <p className="text-xs text-red-500 mt-0.5">Jatuh tempo: {formatDate(d)} ({r.jatuhTempoDays} hari)</p>
                      ) : null;
                    })()}
                    {r.invoiceNo && <p className="text-xs text-gray-300 font-mono">{r.invoiceNo}</p>}
                  </div>
                  <div className="flex gap-1">
                    {r.invoiceNo && (
                      <button onClick={() => setInvoiceSale(r)} className="p-2 rounded-lg hover:bg-blue-50">
                        <FileText className="w-4 h-4 text-blue-400" />
                      </button>
                    )}
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-100">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    {isOwner && (
                      <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={openCreate}
        className="fixed right-4 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center z-30"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="w-6 h-6" />
      </button>

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
          {invoiceSale && <InvoiceView sale={invoiceSale} />}
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
    </>
  );
}
