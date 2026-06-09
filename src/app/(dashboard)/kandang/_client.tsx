"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit2, Trash2, Loader2, X, Home } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";
import type { House } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nama kandang wajib diisi"),
  currentPopulation: z.coerce.number().min(0, "Minimal 0"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData: House[];
}

export default function KandangClient({ initialData }: Props) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [houses, setHouses] = useState<House[]>(initialData);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", currentPopulation: 0, notes: "" },
  });

  async function refresh() {
    setFetching(true);
    try {
      const res = await fetch("/api/v1/houses");
      const json = await res.json();
      setHouses(json.data ?? []);
    } finally {
      setFetching(false);
    }
  }

  function openCreate() {
    form.reset({ name: "", currentPopulation: 0, notes: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(record: House) {
    form.reset({
      name: record.name,
      currentPopulation: record.currentPopulation,
      notes: record.notes ?? "",
    });
    setEditingId(record.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/houses/${editingId}` : "/api/v1/houses";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast({ variant: "success", title: editingId ? "Kandang diperbarui" : "Kandang ditambahkan" });
      setIsSheetOpen(false);
      refresh();
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
      const res = await fetch(`/api/v1/houses/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ variant: "success", title: "Kandang dihapus" });
      setDeleteId(null);
      refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan" });
    } finally {
      setDeleting(false);
    }
  }

  const isOwner = (session?.user?.role === "OWNER" || session?.user?.role === "DEVELOPER");

  const filtered = houses.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <MobileHeader title="Kandang" />
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
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Home className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Belum ada data kandang</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((h) => (
              <div key={h.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{h.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Populasi saat ini: <span className="font-medium text-gray-700">{formatNumber(h.currentPopulation)}</span> ekor
                    </p>
                    {h.notes && <p className="text-xs text-gray-400 mt-1 truncate">{h.notes}</p>}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => openEdit(h)} className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    {isOwner && (
                      <button onClick={() => setDeleteId(h.id)} className="p-2 rounded-lg hover:bg-red-50 active:bg-red-100">
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
        className="fixed right-4 w-14 h-14 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-colors"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingId ? "Edit Kandang" : "Tambah Kandang"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Kandang</Label>
              <Input placeholder="Kandang A" className="h-11" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Populasi Saat Ini (ekor)</Label>
              <Input type="number" min="0" className="h-11" placeholder="0" {...form.register("currentPopulation")} />
              <p className="text-xs text-gray-400">Perbarui angka ini saat ada ayam masuk, pindah, atau diafkir</p>
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
          <DialogHeader><DialogTitle>Hapus Kandang?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Data kandang ini akan dihapus permanen.</p>
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
