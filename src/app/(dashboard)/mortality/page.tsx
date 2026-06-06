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
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber, todayISO } from "@/lib/utils";
import type { Mortality } from "@/types";

const schema = z.object({
  date: z.string().min(1),
  house: z.string().min(1, "Kandang wajib"),
  count: z.coerce.number().min(1, "Minimal 1"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function MortalityPage() {
  useSession();
  const { toast } = useToast();
  const [records, setRecords] = useState<Mortality[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), house: "", count: 1, notes: "" },
  });

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/v1/mortality?${params}`);
    const json = await res.json();
    setRecords(json.data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    form.reset({ date: todayISO(), house: "", count: 1, notes: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(r: Mortality) {
    form.reset({ date: r.date.split("T")[0], house: r.house, count: r.count, notes: r.notes ?? "" });
    setEditingId(r.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/mortality/${editingId}` : "/api/v1/mortality";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Data disimpan" });
      setIsSheetOpen(false);
      fetchData();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await fetch(`/api/v1/mortality/${deleteId}`, { method: "DELETE" });
    toast({ variant: "success", title: "Dihapus" });
    setDeleteId(null);
    fetchData();
  }

  return (
    <>
      <MobileHeader title="Kematian Ternak" />
      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Cari kandang..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>

        {loading ? <Skeleton className="h-20 w-full rounded-xl" /> :
          records.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🐔</p><p className="text-sm">Belum ada data kematian</p></div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{r.house}</Badge>
                      <span className="font-semibold text-red-600">{formatNumber(r.count)} ekor</span>
                    </div>
                    {r.notes && <p className="text-xs text-gray-500 mt-1">{r.notes}</p>}
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
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>{editingId ? "Edit" : "Catat"} Kematian</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Kandang</Label>
                <Input className="h-11" placeholder="Kandang A" {...form.register("house")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Mati (ekor)</Label>
              <Input type="number" min="1" className="h-11 text-lg font-semibold" {...form.register("count")} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan / Penyebab</Label>
              <Textarea rows={2} placeholder="Penyebab kematian..." {...form.register("notes")} />
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
