"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoPicker, fileToLogoDataUrl } from "@/components/settings/LogoPicker";
import { useToast } from "@/hooks/use-toast";
import type { BusinessSettings } from "@/types";

const schema = z.object({
  companyName: z.string().optional(),
  slogan: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountHolder: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function BusinessSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "", slogan: "", address: "", logoUrl: "",
      bankName: "", bankAccountNumber: "", bankAccountHolder: "",
    },
  });

  const canEdit = session?.user?.role === "OWNER" || session?.user?.role === "DEVELOPER";

  useEffect(() => {
    if (!canEdit) return;
    fetch("/api/v1/business-settings")
      .then((res) => res.json())
      .then((json) => {
        const data: BusinessSettings = json.data;
        form.reset({
          companyName: data.companyName ?? "",
          slogan: data.slogan ?? "",
          address: data.address ?? "",
          logoUrl: data.logoUrl ?? "",
          bankName: data.bankName ?? "",
          bankAccountNumber: data.bankAccountNumber ?? "",
          bankAccountHolder: data.bankAccountHolder ?? "",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  if (status === "loading") return null;
  if (!canEdit) {
    router.replace("/dashboard");
    return null;
  }

  async function handleLogoFile(file: File) {
    setLogoUploading(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      form.setValue("logoUrl", dataUrl);
    } catch {
      toast({ variant: "destructive", title: "Gagal memuat gambar" });
    } finally {
      setLogoUploading(false);
    }
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/business-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: "Profil bisnis disimpan" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: String(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <MobileHeader title="Profil Bisnis" />
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Informasi Bisnis</CardTitle>
              <p className="text-xs text-gray-400">
                Informasi ini ditampilkan pada invoice dan header aplikasi untuk semua pengguna.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nama Perusahaan</Label>
                  <Input className="h-11" placeholder="Opsional" {...form.register("companyName")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Slogan</Label>
                  <Input className="h-11" placeholder="Contoh: Telur Bagus Omega" {...form.register("slogan")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Alamat / Catatan</Label>
                  <Textarea placeholder="Opsional — alamat, kontak, dll." rows={2} {...form.register("address")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Logo Perusahaan</Label>
                  <LogoPicker
                    value={form.watch("logoUrl")}
                    uploading={logoUploading}
                    onPick={handleLogoFile}
                    onClear={() => form.setValue("logoUrl", "")}
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-3">
                    Detail Rekening (untuk Invoice)
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nama Bank</Label>
                      <Input className="h-11" placeholder="Contoh: BCA" {...form.register("bankName")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nomor Rekening</Label>
                      <Input className="h-11" placeholder="Contoh: 1234567890" {...form.register("bankAccountNumber")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Atas Nama</Label>
                      <Input className="h-11" placeholder="Nama pemilik rekening" {...form.register("bankAccountHolder")} />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 mt-2" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
