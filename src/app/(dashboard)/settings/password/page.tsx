"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
  confirmPassword: z.string().min(1),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function PasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: "Password berhasil diubah" });
      form.reset();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: String(e) });
    } finally { setLoading(false); }
  }

  return (
    <>
      <MobileHeader title="Ganti Password" />
      <div className="px-4 py-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ubah Password Akun</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Password Lama</Label>
                <div className="relative">
                  <Input type={showCurrent ? "text" : "password"} className="h-12 pr-12" {...form.register("currentPassword")} />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showCurrent ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
                {form.formState.errors.currentPassword && <p className="text-xs text-red-500">{form.formState.errors.currentPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Password Baru</Label>
                <div className="relative">
                  <Input type={showNew ? "text" : "password"} className="h-12 pr-12" {...form.register("newPassword")} />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showNew ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
                {form.formState.errors.newPassword && <p className="text-xs text-red-500">{form.formState.errors.newPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Konfirmasi Password Baru</Label>
                <Input type="password" className="h-12" {...form.register("confirmPassword")} />
                {form.formState.errors.confirmPassword && <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 mt-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ubah Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
