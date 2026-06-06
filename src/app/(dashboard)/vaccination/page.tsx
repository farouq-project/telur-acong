"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, CheckCircle, Clock } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import type { VaccinationSchedule } from "@/types";
import { differenceInDays, parseISO } from "date-fns";

const schema = z.object({
  vaccineName: z.string().min(1, "Nama vaksin wajib"),
  scheduleDate: z.string().min(1, "Tanggal wajib"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function VaccinationPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<VaccinationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { vaccineName: "", scheduleDate: "", notes: "" },
  });

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/v1/vaccination?includeDone=${showDone}`);
    const json = await res.json();
    setRecords(json.data ?? []);
    setLoading(false);
  }, [showDone]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    form.reset({ vaccineName: "", scheduleDate: "", notes: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(r: VaccinationSchedule) {
    form.reset({ vaccineName: r.vaccineName, scheduleDate: r.scheduleDate.split("T")[0], notes: r.notes ?? "" });
    setEditingId(r.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/vaccination/${editingId}` : "/api/v1/vaccination";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Jadwal disimpan" });
      setIsSheetOpen(false);
      fetchData();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function markDone(id: string, isDone: boolean) {
    await fetch(`/api/v1/vaccination/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone }),
    });
    fetchData();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await fetch(`/api/v1/vaccination/${deleteId}`, { method: "DELETE" });
    toast({ variant: "success", title: "Dihapus" });
    setDeleteId(null);
    fetchData();
  }

  function getDaysLabel(scheduleDate: string): { label: string; color: string } {
    const days = differenceInDays(parseISO(scheduleDate.split("T")[0]), new Date());
    if (days < 0) return { label: "Terlambat", color: "destructive" };
    if (days === 0) return { label: "Hari ini!", color: "destructive" };
    if (days <= 7) return { label: `${days} hari lagi`, color: "warning" };
    return { label: `${days} hari lagi`, color: "secondary" };
  }

  return (
    <>
      <MobileHeader title="Jadwal Vaksin" />
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDone(!showDone)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${showDone ? "bg-green-600 text-white border-green-600" : "text-gray-500 border-gray-200"}`}
          >
            {showDone ? "Sembunyikan Selesai" : "Tampilkan Selesai"}
          </button>
        </div>

        {loading ? <Skeleton className="h-20 w-full rounded-xl" /> :
          records.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">💉</p><p className="text-sm">Belum ada jadwal vaksin</p></div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => {
                const { label, color } = getDaysLabel(r.scheduleDate);
                return (
                  <div key={r.id} className={`bg-white rounded-xl p-4 border shadow-sm ${r.isDone ? "opacity-60 border-gray-100" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.isDone ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="font-medium text-gray-800 text-sm">{r.vaccineName}</span>
                          {!r.isDone && <Badge variant={color as "destructive" | "warning" | "secondary"}>{label}</Badge>}
                          {r.isDone && <Badge variant="success">Selesai</Badge>}
                        </div>
                        <p className="text-xs text-gray-400">{formatDate(r.scheduleDate)}</p>
                        {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {!r.isDone && (
                          <button
                            onClick={() => markDone(r.id, true)}
                            className="p-2 rounded-lg hover:bg-green-50 text-green-500"
                            title="Tandai selesai"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-100"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                        <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      <button onClick={openCreate} className="fixed right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center z-30" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>{editingId ? "Edit Jadwal" : "Tambah Jadwal Vaksin"}</SheetTitle></SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Vaksin</Label>
              <Input className="h-11" placeholder="Newcastle Disease" {...form.register("vaccineName")} />
              {form.formState.errors.vaccineName && <p className="text-xs text-red-500">{form.formState.errors.vaccineName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Jadwal</Label>
              <Input type="date" className="h-11" {...form.register("scheduleDate")} />
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
          <DialogHeader><DialogTitle>Hapus Jadwal?</DialogTitle></DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
