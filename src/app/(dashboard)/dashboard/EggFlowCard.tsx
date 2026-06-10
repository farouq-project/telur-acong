"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatDate } from "@/lib/utils";
import { Waves } from "lucide-react";
import type { EggFlowDay } from "@/services/production.service";

export function EggFlowCard({ eggFlow }: { eggFlow: EggFlowDay[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Waves className="w-4 h-4 text-blue-600" />
          Alur Stok Telur Harian
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="font-medium px-2 py-1.5 text-left">Tanggal</th>
                <th className="font-medium px-2 py-1.5 text-right">Stok Kemarin (kg)</th>
                <th className="font-medium px-2 py-1.5 text-right">Produksi Hari Ini (kg)</th>
                <th className="font-medium px-2 py-1.5 text-right">Terjual Hari Ini (kg)</th>
                <th className="font-medium px-2 py-1.5 text-right">Stok Hari Ini (kg)</th>
              </tr>
            </thead>
            <tbody>
              {eggFlow.map((d) => (
                <tr key={d.date} className="border-b last:border-b-0">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{formatDate(d.date)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(d.stokKemarin)}</td>
                  <td className="px-2 py-1.5 text-right text-blue-600">+{formatNumber(d.produksiHariIni)}</td>
                  <td className="px-2 py-1.5 text-right text-purple-600">−{formatNumber(d.terjualHariIni)}</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{formatNumber(d.stokHariIni)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
