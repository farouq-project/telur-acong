"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Loader2, Eye, EyeOff, Image as ImageIcon, X } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: "Developer",
  OWNER: "Pemilik",
  STAFF: "Staf",
  FARM_HEAD: "Farm Head",
  QA_HEAD: "QA Head",
};

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["DEVELOPER", "OWNER", "STAFF", "FARM_HEAD", "QA_HEAD"]),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  logoUrl: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["DEVELOPER", "OWNER", "STAFF", "FARM_HEAD", "QA_HEAD"]),
  isActive: z.boolean(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
  logoUrl: z.string().optional(),
  newPassword: z.string().optional(),
});

// Resize & compress an image file to a small base64 data URL for storage as a company logo.
function fileToLogoDataUrl(file: File, maxDim = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function UsersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const isDeveloper = session?.user?.role === "DEVELOPER";

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", role: "STAFF", companyName: "", notes: "", logoUrl: "" },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", role: "STAFF", isActive: true, companyName: "", notes: "", logoUrl: "", newPassword: "" },
  });

  const [logoUploading, setLogoUploading] = useState(false);

  async function handleLogoFile(file: File, setValue: (val: string) => void) {
    setLogoUploading(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setValue(dataUrl);
    } catch {
      toast({ variant: "destructive", title: "Gagal memuat gambar" });
    } finally {
      setLogoUploading(false);
    }
  }

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
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyName: data.companyName || null, notes: data.notes || null, logoUrl: data.logoUrl || null }),
      });
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
      const res = await fetch(`/api/v1/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          companyName: data.companyName || null,
          notes: data.notes || null,
          logoUrl: data.logoUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Reset password if filled in
      if (data.newPassword && data.newPassword.length >= 6) {
        const pwRes = await fetch(`/api/v1/users/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resetPassword", newPassword: data.newPassword }),
        });
        if (!pwRes.ok) {
          const pwJson = await pwRes.json();
          throw new Error(pwJson.error);
        }
      }

      toast({ variant: "success", title: "Pengguna diperbarui" });
      setMode(null);
      fetchUsers();
    } catch (e) { toast({ variant: "destructive", title: "Gagal", description: String(e) }); }
    finally { setSubmitting(false); }
  }

  function openEdit(user: User) {
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      companyName: user.companyName ?? "",
      notes: user.notes ?? "",
      logoUrl: user.logoUrl ?? "",
      newPassword: "",
    });
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
              <div key={u.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800">{u.name}</span>
                      <Badge
                        variant={u.role === "DEVELOPER" ? "destructive" : u.role === "OWNER" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                      {!u.isActive && <Badge variant="destructive" className="text-xs">Nonaktif</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                    {u.companyName && (
                      <p className="text-xs text-green-700 font-medium mt-0.5">{u.companyName}</p>
                    )}
                    {isDeveloper && u.password && (
                      <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                        <span className="text-gray-300 mr-1">hash:</span>
                        {u.password.slice(0, 20)}…
                      </p>
                    )}
                  </div>
                  {isDeveloper && (
                    <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-gray-100 ml-2 shrink-0">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isDeveloper && (
          <button
            onClick={() => { createForm.reset(); setMode("create"); }}
            className="w-full h-12 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Pengguna
          </button>
        )}
      </div>

      {/* Create Sheet — DEVELOPER only */}
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
              <div className="relative">
                <Input type={showCreatePw ? "text" : "password"} className="h-11 pr-10" placeholder="Min. 6 karakter" {...createForm.register("password")} />
                <button type="button" onClick={() => setShowCreatePw(!showCreatePw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showCreatePw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Perusahaan</Label>
              <Input className="h-11" placeholder="Opsional" {...createForm.register("companyName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea placeholder="Opsional — alamat, kontak, dll." rows={2} {...createForm.register("notes")} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo Perusahaan</Label>
              <LogoPicker
                value={createForm.watch("logoUrl")}
                uploading={logoUploading}
                onPick={(file) => handleLogoFile(file, (v) => createForm.setValue("logoUrl", v))}
                onClear={() => createForm.setValue("logoUrl", "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select onValueChange={(v) => createForm.setValue("role", v as CreateForm["role"])} value={createForm.watch("role")}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staf</SelectItem>
                  <SelectItem value="FARM_HEAD">Farm Head</SelectItem>
                  <SelectItem value="QA_HEAD">QA Head</SelectItem>
                  <SelectItem value="OWNER">Pemilik</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
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

      {/* Edit Sheet — DEVELOPER only */}
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
            <div className="space-y-1.5">
              <Label>Nama Perusahaan</Label>
              <Input className="h-11" placeholder="Opsional" {...editForm.register("companyName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea placeholder="Opsional — alamat, kontak, dll." rows={2} {...editForm.register("notes")} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo Perusahaan</Label>
              <LogoPicker
                value={editForm.watch("logoUrl")}
                uploading={logoUploading}
                onPick={(file) => handleLogoFile(file, (v) => editForm.setValue("logoUrl", v))}
                onClear={() => editForm.setValue("logoUrl", "")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select onValueChange={(v) => editForm.setValue("role", v as EditForm["role"])} value={editForm.watch("role")}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staf</SelectItem>
                    <SelectItem value="OWNER">Pemilik</SelectItem>
                    <SelectItem value="DEVELOPER">Developer</SelectItem>
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
            <div className="space-y-1.5">
              <Label>Reset Password (kosongkan jika tidak diubah)</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  className="h-11 pr-10"
                  placeholder="Min. 6 karakter"
                  {...editForm.register("newPassword")}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showNewPw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
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

function LogoPicker({
  value, uploading, onPick, onClear,
}: {
  value?: string;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Logo" className="w-14 h-14 rounded-lg object-contain border border-gray-200 bg-white" />
      ) : (
        <div className="w-14 h-14 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
          <ImageIcon className="w-5 h-5" />
        </div>
      )}
      <label className="flex-1">
        <span className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pilih Gambar"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
      </label>
      {value && (
        <button type="button" onClick={onClear} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
