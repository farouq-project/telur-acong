"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV, generateCSV, todayISO } from "@/lib/utils";

const reportTypes = [
  { value: "production", label: "Produksi Telur" },
  { value: "sales", label: "Penjualan Telur" },
  { value: "medicine", label: "Obat & Vaksin" },
  { value: "mortality", label: "Kematian Ternak" },
  { value: "feed-sales", label: "Penjualan Pakan" },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [type, setType] = useState("production");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);

  async function fetchReport() {
    setLoading(true);
    setPreviewData(null);
    try {
      const params = new URLSearchParams({ type });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/v1/reports?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setPreviewData(json.data);
      setHeaders(json.headers);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal", description: String(e) });
    } finally { setLoading(false); }
  }

  function exportCSV() {
    if (!previewData || !headers.length) return;
    const rows = previewData.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const s = String(val ?? "");
        return s.includes(",") ? `"${s}"` : s;
      })
    );
    const csv = generateCSV(headers, rows);
    const label = reportTypes.find((r) => r.value === type)?.label ?? type;
    downloadCSV(csv, `laporan-${label.replace(/\s+/g, "-").toLowerCase()}-${todayISO()}.csv`);
    toast({ variant: "success", title: "File CSV diunduh" });
  }

  return (
    <>
      <MobileHeader title="Laporan" />
      <div className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Filter Laporan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Jenis Laporan</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dari Tanggal</Label>
                <Input type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sampai Tanggal</Label>
                <Input type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <Button onClick={fetchReport} className="w-full h-11 bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              Tampilkan Laporan
            </Button>
          </CardContent>
        </Card>

        {previewData && (
          <Card>
            <CardHeader className="pb-2 pt-4 flex-row items-center justify-between">
              <CardTitle className="text-sm">{previewData.length} data ditemukan</CardTitle>
              <Button size="sm" variant="outline" onClick={exportCSV} className="h-8">
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-4">
              {previewData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Tidak ada data dalam rentang ini</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          {headers.map((h) => (
                            <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(row[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 20 && (
                    <p className="text-xs text-gray-400 text-center py-2 px-4">
                      Menampilkan 20 dari {previewData.length} baris. Export CSV untuk data lengkap.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
