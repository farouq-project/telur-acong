"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Loader2 } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["OWNER", "STAFF"]),
});

const editSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["OWNER", "STAFF"]),
  isActive: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", role: "STAFF" },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", role: "STAFF", isActive: true },
  });

  async function fetchUsers() {
    const res = await fetch("/api/v1/users");
    const json = await res.json();
    setUsers(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function onCreate(data: CreateForm) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: "Pengguna dibuat" });
      setMode(null);
      fetchUsers();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function onEdit(data: EditForm) {
    if (!editingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/users/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: "Pengguna diperbarui" });
      setMode(null);
      fetchUsers();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  function openEdit(user: User) {
    editForm.reset({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
    setEditingId(user.id);
    setMode("edit");
  }

  return (
    <>
      <MobileHeader title="Kelola Pengguna" />
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{u.name}</span>
                    <Badge variant={u.role === "OWNER" ? "default" : "secondary"} className="text-xs">
                      {u.role === "OWNER" ? "Pemilik" : "Staf"}
                    </Badge>
                    {!u.isActive && <Badge variant="destructive" className="text-xs">Nonaktif</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                </div>
                <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-gray-100">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { createForm.reset(); setMode("create"); }}
          className="w-full h-12 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </button>
      </div>

      {/* Create Sheet */}
      <Sheet open={mode === "create"} onOpenChange={(o) => !o && setMode(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>Tambah Pengguna</SheetTitle></SheetHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input className="h-11" {...createForm.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" className="h-11" {...createForm.register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" className="h-11" placeholder="Min. 6 karakter" {...createForm.register("password")} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select onValueChange={(v) => createForm.setValue("role", v as "OWNER" | "STAFF")} value={createForm.watch("role")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staf</SelectItem>
                  <SelectItem value="OWNER">Pemilik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setMode(null)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buat Akun"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={mode === "edit"} onOpenChange={(o) => !o && setMode(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4"><SheetTitle>Edit Pengguna</SheetTitle></SheetHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input className="h-11" {...editForm.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" className="h-11" {...editForm.register("email")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select onValueChange={(v) => editForm.setValue("role", v as "OWNER" | "STAFF")} value={editForm.watch("role")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staf</SelectItem>
                    <SelectItem value="OWNER">Pemilik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select onValueChange={(v) => editForm.setValue("isActive", v === "true")} value={String(editForm.watch("isActive"))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2 pb-4">
              <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setMode(null)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
