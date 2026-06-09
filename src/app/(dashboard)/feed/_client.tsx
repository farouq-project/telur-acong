"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, ShoppingBag, Wheat, ShoppingCart } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, formatRupiah, todayISO } from "@/lib/utils";
import type { FeedProduct, FeedPurchase, FeedUsage, FeedSale } from "@/types";

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

type PurchaseForm = z.infer<typeof purchaseSchema>;
type SaleForm = z.infer<typeof saleSchema>;
type ProductForm = z.infer<typeof productSchema>;

interface Props {
  initialProducts: FeedProduct[];
  initialPurchases: FeedPurchase[];
  initialUsages: FeedUsage[];
  initialFeedSales: FeedSale[];
}

export default function FeedClient({ initialProducts, initialPurchases, initialUsages, initialFeedSales }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [products, setProducts] = useState<FeedProduct[]>(initialProducts);
  const [purchases, setPurchases] = useState<FeedPurchase[]>(initialPurchases);
  const [usages, setUsages] = useState<FeedUsage[]>(initialUsages);
  const [feedSales, setFeedSales] = useState<FeedSale[]>(initialFeedSales);
  const [fetching, setFetching] = useState(false);
  const [activeSheet, setActiveSheet] = useState<"purchase" | "sale" | "product" | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const purchaseForm = useForm<PurchaseForm>({ resolver: zodResolver(purchaseSchema), defaultValues: { date: todayISO(), feedProductId: "", qty: 0, pricePerKg: "", notes: "" } });
  const saleForm = useForm<SaleForm>({ resolver: zodResolver(saleSchema), defaultValues: { date: todayISO(), customerName: "", feedProductId: "", qty: 0, unitPrice: 0 } });
  const productForm = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: { name: "", unit: "kg" } });

  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const [p, pu, u, s] = await Promise.all([
        fetch("/api/v1/feed-products").then((r) => r.json()),
        fetch("/api/v1/feed-purchases").then((r) => r.json()),
        fetch("/api/v1/feed-usage").then((r) => r.json()),
        fetch("/api/v1/feed-sales").then((r) => r.json()),
      ]);
      setProducts(p.data ?? []);
      setPurchases(pu.data ?? []);
      setUsages(u.data ?? []);
      setFeedSales(s.data ?? []);
    } finally {
      setFetching(false);
    }
  }, []);

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

  return (
    <>
      <MobileHeader title="Manajemen Pakan" />
      <div className="px-4 py-4">
        <Tabs defaultValue="purchases">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="purchases" className="text-xs">Beli</TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">Pakai</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs">Jual</TabsTrigger>
            <TabsTrigger value="products" className="text-xs">Produk</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-2">
            {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              purchases.length === 0 ? <Empty label="Belum ada pembelian pakan" /> :
              purchases.map((r) => (
                <FeedRow key={r.id}
                  icon={<ShoppingBag className="w-4 h-4" />}
                  accent="green"
                  label="Pembelian"
                  title={(r.feedProduct as FeedProduct)?.name ?? ""}
                  qty={`${formatNumber(r.qty)} ${(r.feedProduct as FeedProduct)?.unit ?? "kg"}`}
                  detail={
                    r.pricePerKg != null && r.totalValue != null
                      ? `Rp${formatNumber(r.pricePerKg)}/kg — ${formatRupiah(r.totalValue)}`
                      : r.notes || undefined
                  }
                  date={r.date}
                  onEdit={() => openPurchase(r)}
                  onDelete={() => setDeleteTarget({ id: r.id, type: "purchase" })}
                  isOwner={isOwner}
                />
              ))}
          </TabsContent>

          <TabsContent value="usage" className="space-y-2">
            <p className="text-xs text-gray-400 px-1">Pemakaian terisi otomatis dari catatan Produksi Telur — tab ini hanya untuk pemantauan.</p>
            {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              usages.length === 0 ? <Empty label="Belum ada pemakaian pakan" /> :
              usages.map((r) => (
                <FeedRow key={r.id}
                  icon={<Wheat className="w-4 h-4" />}
                  accent="amber"
                  label="Pemakaian"
                  title={(r.feedProduct as FeedProduct)?.name ?? ""}
                  qty={`${formatNumber(r.qtyUsed)} ${(r.feedProduct as FeedProduct)?.unit ?? "kg"}`}
                  detail={
                    r.totalCost != null
                      ? `Kandang ${r.house} — ${formatRupiah(r.totalCost)} (Rp${formatNumber(r.unitCost ?? 0)}/kg, FIFO)`
                      : `Kandang ${r.house}`
                  }
                  date={r.date}
                  isOwner={isOwner}
                />
              ))}
          </TabsContent>

          <TabsContent value="sales" className="space-y-2">
            {fetching ? <div className="h-20 rounded-xl bg-gray-100 animate-pulse" /> :
              feedSales.length === 0 ? <Empty label="Belum ada penjualan pakan" /> :
              feedSales.map((r) => (
                <FeedRow key={r.id}
                  icon={<ShoppingCart className="w-4 h-4" />}
                  accent="purple"
                  label="Penjualan"
                  title={r.customerName}
                  qty={`${(r.feedProduct as FeedProduct)?.name ?? ""} — ${formatNumber(r.qty)}`}
                  detail={formatRupiah(r.totalValue)}
                  date={r.date}
                  onEdit={() => openSale(r)}
                  onDelete={() => setDeleteTarget({ id: r.id, type: "sale" })}
                  isOwner={isOwner}
                />
              ))}
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
        </Tabs>
      </div>

      <button
        onClick={() => setChooserOpen(true)}
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Tambah catatan pakan"
      >
        <Plus className="w-6 h-6" />
      </button>

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

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus Data?</DialogTitle></DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Hapus</Button>
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

function FeedRow({ icon, accent, label, title, qty, detail, date, onEdit, onDelete, isOwner }: {
  icon: React.ReactNode; accent: "green" | "amber" | "purple"; label: string;
  title: string; qty: string; detail?: string; date: string;
  onEdit?: () => void; onDelete?: () => void; isOwner: boolean;
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <div className={`bg-white rounded-xl p-3.5 border border-gray-100 border-l-4 ${a.border} shadow-sm flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-lg ${a.bg} ${a.text} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-medium uppercase tracking-wide ${a.text}`}>{label}</span>
          <span className="text-[11px] text-gray-400 shrink-0">{formatDate(date)}</span>
        </div>
        <p className="font-semibold text-gray-800 text-sm truncate mt-0.5">{title}</p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-gray-600 truncate">{qty}</p>
          {detail && <p className="text-xs text-gray-400 truncate shrink-0">{detail}</p>}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex flex-col gap-0.5 shrink-0">
          {onEdit && <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>}
          {onDelete && isOwner && <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>
      )}
    </div>
  );
}

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
