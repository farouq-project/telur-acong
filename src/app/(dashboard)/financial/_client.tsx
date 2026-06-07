"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatRupiah, todayISO } from "@/lib/utils";
import type { FinancialNote } from "@/types";

const schema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number().min(1, "Nominal wajib diisi"),
  description: z.string().min(1, "Keterangan wajib diisi"),
});

type FormData = z.infer<typeof schema>;

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface Props {
  initialData: FinancialNote[];
  initialSummary: Summary;
}

export default function FinancialClient({ initialData, initialSummary }: Props) {
  const { toast } = useToast();
  const [records, setRecords] = useState<FinancialNote[]>(initialData);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [fetching, setFetching] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), type: "INCOME", amount: 0, description: "" },
  });

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/v1/financial");
      const json = await res.json();
      setRecords(json.data ?? []);
      if (json.summary) setSummary(json.summary);
    } finally {
      setFetching(false);
    }
  }, []);

  function openCreate() {
    form.reset({ date: todayISO(), type: "INCOME", amount: 0, description: "" });
    setEditingId(null);
    setIsSheetOpen(true);
  }

  function openEdit(record: FinancialNote) {
    form.reset({
      date: record.date.split("T")[0],
      type: record.type,
      amount: record.amount,
      description: record.description,
    });
    setEditingId(record.id);
    setIsSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const url = editingId ? `/api/v1/financial/${editingId}` : "/api/v1/financial";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: editingId ? "Data diperbarui" : "Catatan ditambahkan" });
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
      const res = await fetch(`/api/v1/financial/${deleteId}`, { method: "DELETE" });
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

  return (
    <>
      <MobileHeader title="Catatan Keuangan" />
      <div className="px-4 py-4 space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs text-green-600">Pemasukan</p>
              </div>
              <p className="text-sm font-bold text-green-700 truncate">{formatRupiah(summary.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                <p className="text-xs text-red-500">Pengeluaran</p>
              </div>
              <p className="text-sm font-bold text-red-600 truncate">{formatRupiah(summary.totalExpense)}</p>
            </CardContent>
          </Card>
          <Card className={summary.balance >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <Wallet className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-xs text-blue-500">Saldo</p>
              </div>
              <p className={`text-sm font-bold truncate ${summary.balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {formatRupiah(summary.balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {fetching ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">💰</p>
            <p className="text-sm">Belum ada catatan keuangan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      <Badge
                        variant={r.type === "INCOME" ? "success" : "destructive"}
                        className="text-xs"
                      >
                        {r.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{r.description}</p>
                    <p className={`text-base font-bold mt-0.5 ${r.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                      {r.type === "INCOME" ? "+" : "-"}{formatRupiah(r.amount)}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-gray-100">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
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
            <SheetTitle>{editingId ? "Edit Catatan" : "Tambah Catatan Keuangan"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <select
                  className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...form.register("type")}
                >
                  <option value="INCOME">Pemasukan</option>
                  <option value="EXPENSE">Pengeluaran</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nominal (Rp)</Label>
              <Input type="number" min="1" className="h-11" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Input placeholder="Penjualan telur, beli pakan, dll..." className="h-11" {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
              )}
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
          <DialogHeader><DialogTitle>Hapus Catatan?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Catatan keuangan ini akan dihapus permanen.</p>
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
