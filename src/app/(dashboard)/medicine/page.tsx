"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2, Trash2, Loader2, X } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, todayISO } from "@/lib/utils";
import type { MedicineVaccine } from "@/types";

const schema = z.object({
  date: z.string().min(1),
  productName: z.string().min(1, "Nama produk wajib"),
  category: z.enum(["MEDICINE", "VACCINE"]),
  qty: z.coerce.number().min(0.01),
  unit: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function MedicinePage() {
  useSession();
  const { toast } = useToast();
  const [records, setRecords] = useState<MedicineVaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "MEDICINE" | "VACCINE">("ALL");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), productName: "", category: "MEDICINE", qty: 1, unit: "botol", notes: "" },
  });

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "ALL") params.set("category", filter);
    const res = await fetch(`/api/v1/medicine?${params}`);
    const json = await res.json();
    setRecords(json.data ?? []);
    setLoading(false);
  }, [search, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    form.reset({ date: todayISO(), productName: "", category: "MEDICINE", qty: 1, unit: "botol", notes: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(r: MedicineVaccine) {
    form.reset({ date: r.date.split("T")[0], productName: r.productName, category: r.category, qty: r.qty, unit: r.unit, notes: r.notes ?? "" });
    setEditingId(r.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/medicine/${editingId}` : "/api/v1/medicine";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Data disimpan" });
      setIsSheetOpen(false);
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: String(e) });
    } finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await fetch(`/api/v1/medicine/${deleteId}`, { method: "DELETE" });
    toast({ variant: "success", title: "Dihapus" });
    setDeleteId(null);
    fetchData();
  }

  return (
    <>
      <MobileHeader title="Obat & Vaksin" />
      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="ALL">Semua</TabsTrigger>
            <TabsTrigger value="MEDICINE">Obat</TabsTrigger>
            <TabsTrigger value="VACCINE">Vaksin</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? <Skeleton className="h-20 w-full rounded-xl" /> :
          records.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">💊</p><p className="text-sm">Belum ada data</p></div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    <p className="font-medium text-sm text-gray-800">{r.productName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={r.category === "VACCINE" ? "success" : "secondary"}>
                        {r.category === "VACCINE" ? "Vaksin" : "Obat"}
                      </Badge>
                      <span className="text-xs text-gray-500">{formatNumber(r.qty)} {r.unit}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-100"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <button onClick={openCreate} className="fixed right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center z-30" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>{editingId ? "Edit" : "Tambah"} Obat/Vaksin</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select onValueChange={(v) => form.setValue("category", v as "MEDICINE" | "VACCINE")} value={form.watch("category")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEDICINE">Obat</SelectItem>
                    <SelectItem value="VACCINE">Vaksin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Produk</Label>
              <Input className="h-11" placeholder="Nama obat/vaksin" {...form.register("productName")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Jumlah</Label>
                <Input type="number" step="0.01" className="h-11" {...form.register("qty")} />
              </div>
              <div className="space-y-1.5">
                <Label>Satuan</Label>
                <Input className="h-11" placeholder="botol" {...form.register("unit")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea rows={2} {...form.register("notes")} />
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setIsSheetOpen(false)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Hapus Data?</DialogTitle></DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
