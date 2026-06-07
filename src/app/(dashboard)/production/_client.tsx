"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2, Trash2, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
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
import type { EggProduction } from "@/types";

const schema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  house: z.string().min(1, "Kandang wajib diisi"),
  goodEggs: z.coerce.number().min(0, "Minimal 0"),
  crackedEggs: z.coerce.number().min(0, "Minimal 0"),
  rejectedEggs: z.coerce.number().min(0, "Minimal 0"),
  populasi: z.coerce.number().min(0).optional().or(z.literal("")),
  goodEggsKg: z.coerce.number().min(0).optional().or(z.literal("")),
  crackedEggsKg: z.coerce.number().min(0).optional().or(z.literal("")),
  rejectedEggsKg: z.coerce.number().min(0).optional().or(z.literal("")),
  feedQtyKg: z.coerce.number().min(0).optional().or(z.literal("")),
  feedPricePerKg: z.coerce.number().min(0).optional().or(z.literal("")),
  mortality: z.coerce.number().min(0).optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData: EggProduction[];
}

function computeMetrics(r: EggProduction) {
  const totalEggs = r.goodEggs + r.crackedEggs + r.rejectedEggs;
  const hd = r.populasi && r.populasi > 0 ? ((totalEggs / r.populasi) * 100) : null;
  const feedIntake = r.populasi && r.populasi > 0 && r.feedQtyKg ? (r.feedQtyKg / r.populasi) : null;
  const fcr = r.goodEggsKg && r.goodEggsKg > 0 && r.feedQtyKg ? ((r.feedQtyKg / r.goodEggsKg) * 100) : null;
  const hpp = r.goodEggsKg && r.goodEggsKg > 0 && r.feedQtyKg && r.feedPricePerKg
    ? ((r.feedQtyKg * r.feedPricePerKg) / r.goodEggsKg)
    : null;
  return { hd, feedIntake, fcr, hpp };
}

export default function ProductionClient({ initialData }: Props) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayISO(), house: "", goodEggs: 0, crackedEggs: 0, rejectedEggs: 0,
      populasi: "", goodEggsKg: "", crackedEggsKg: "", rejectedEggsKg: "",
      feedQtyKg: "", feedPricePerKg: "", mortality: "", notes: "",
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
    date: todayISO(), house: "", goodEggs: 0, crackedEggs: 0, rejectedEggs: 0,
    populasi: "" as const, goodEggsKg: "" as const, crackedEggsKg: "" as const,
    rejectedEggsKg: "" as const, feedQtyKg: "" as const, feedPricePerKg: "" as const,
    mortality: "" as const, notes: "",
  };

  function openCreate() {
    form.reset(defaultValues);
    setEditingId(null);
    setShowAdvanced(false);
    setIsSheetOpen(true);
  }

  function openEdit(record: EggProduction) {
    form.reset({
      date: record.date.split("T")[0],
      house: record.house,
      goodEggs: record.goodEggs,
      crackedEggs: record.crackedEggs,
      rejectedEggs: record.rejectedEggs,
      populasi: record.populasi ?? "",
      goodEggsKg: record.goodEggsKg ?? "",
      crackedEggsKg: record.crackedEggsKg ?? "",
      rejectedEggsKg: record.rejectedEggsKg ?? "",
      feedQtyKg: record.feedQtyKg ?? "",
      feedPricePerKg: record.feedPricePerKg ?? "",
      mortality: record.mortality ?? "",
      notes: record.notes ?? "",
    });
    setEditingId(record.id);
    const hasAdvanced = !!(record.populasi || record.feedQtyKg || record.goodEggsKg);
    setShowAdvanced(hasAdvanced);
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
        rejectedEggsKg: data.rejectedEggsKg !== "" ? data.rejectedEggsKg : null,
        feedQtyKg: data.feedQtyKg !== "" ? data.feedQtyKg : null,
        feedPricePerKg: data.feedPricePerKg !== "" ? data.feedPricePerKg : null,
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

  const isOwner = session?.user?.role === "OWNER";

  return (
    <>
      <MobileHeader title="Produksi Telur" />
      <div className="px-4 py-4 space-y-3">
        <div className="relative">
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
                            <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">FCR {fcr.toFixed(1)}%</span>
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
                <Label>Tanggal</Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Kandang</Label>
                <Input placeholder="Kandang A" className="h-11" {...form.register("house")} />
                {form.formState.errors.house && (
                  <p className="text-xs text-red-500">{form.formState.errors.house.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telur Bagus (butir)</Label>
                <Input type="number" min="0" className="h-11" {...form.register("goodEggs")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retak (butir)</Label>
                <Input type="number" min="0" className="h-11" {...form.register("crackedEggs")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">BS (butir)</Label>
                <Input type="number" min="0" className="h-11" {...form.register("rejectedEggs")} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 w-full py-1"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Detail Lanjutan (Berat, Pakan, Populasi)
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t pt-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bagus (kg)</Label>
                    <Input type="number" min="0" step="0.01" className="h-11" placeholder="0.00" {...form.register("goodEggsKg")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Retak (kg)</Label>
                    <Input type="number" min="0" step="0.01" className="h-11" placeholder="0.00" {...form.register("crackedEggsKg")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">BS (kg)</Label>
                    <Input type="number" min="0" step="0.01" className="h-11" placeholder="0.00" {...form.register("rejectedEggsKg")} />
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
                    <Label className="text-xs">Harga Pakan (Rp/kg)</Label>
                    <Input type="number" min="0" className="h-11" placeholder="0" {...form.register("feedPricePerKg")} />
                  </div>
                </div>
              </div>
            )}

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
    </>
  );
}
