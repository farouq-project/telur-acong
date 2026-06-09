"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Egg, Wheat, TrendingDown, TrendingUp, RefreshCw, History, PackagePlus, EggOff } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type { FeedStockItem, EggStockBreakdown } from "@/services/stock.service";

interface StockData {
  eggStock: EggStockBreakdown;
  feedStocks: FeedStockItem[];
  todayCrackedEggs: { butir: number; kgTotal: number };
}

interface Props {
  initialData: StockData;
}

export default function StockClient({ initialData }: Props) {
  const [data] = useState<StockData>(initialData);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <>
      <MobileHeader title="Stok" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Ringkasan Stok</h2>
          <button onClick={refresh} className="p-2 rounded-full hover:bg-gray-100">
            <RefreshCw className={`w-4 h-4 text-gray-400 ${pending ? "animate-spin" : ""}`} />
          </button>
        </div>

        <Card className={data.eggStock.currentStock < 500 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Egg className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Stok Telur Saat Ini</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(data.eggStock.currentStock)}
                  <span className="text-sm font-normal text-gray-400 ml-1">kg</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Stok kemarin + produksi hari ini − terjual hari ini</p>
              </div>
              <div>
                {data.eggStock.currentStock < 500 ? (
                  <Badge variant="destructive">Rendah</Badge>
                ) : (
                  <Badge variant="success">Normal</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              Rincian Stok Telur Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <History className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Stok Kemarin</span>
                </div>
                <p className="text-base font-bold text-gray-800">
                  {formatNumber(data.eggStock.previousStock)}
                  <span className="text-xs font-normal text-gray-400 ml-0.5">kg</span>
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <PackagePlus className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-blue-600">Produksi Hari Ini</span>
                </div>
                <p className="text-base font-bold text-blue-700">
                  +{formatNumber(data.eggStock.todayProduced)}
                  <span className="text-xs font-normal text-blue-400 ml-0.5">kg</span>
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs text-purple-600">Terjual Hari Ini</span>
                </div>
                <p className="text-base font-bold text-purple-700">
                  −{formatNumber(data.eggStock.todaySold)}
                  <span className="text-xs font-normal text-purple-400 ml-0.5">kg</span>
                </p>
              </div>
            </div>
            {(data.todayCrackedEggs.butir > 0 || data.todayCrackedEggs.kgTotal > 0) && (
              <div className="mt-2 bg-orange-50 rounded-xl p-3 flex items-center gap-3">
                <EggOff className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-xs text-orange-600 font-medium">Telur Retak Hari Ini</p>
                  <p className="text-sm font-bold text-orange-700">
                    {formatNumber(data.todayCrackedEggs.butir)} butir
                    {data.todayCrackedEggs.kgTotal > 0 && (
                      <span className="text-xs font-normal text-orange-400 ml-2">
                        ({formatNumber(data.todayCrackedEggs.kgTotal)} kg)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Stok saat ini = stok kemarin ({formatNumber(data.eggStock.previousStock)} kg) + produksi hari ini ({formatNumber(data.eggStock.todayProduced)} kg) − terjual hari ini ({formatNumber(data.eggStock.todaySold)} kg) = <span className="font-medium text-gray-600">{formatNumber(data.eggStock.currentStock)} kg</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wheat className="w-4 h-4 text-amber-600" />
              Stok Pakan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {!data.feedStocks || data.feedStocks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada produk pakan terdaftar</p>
            ) : (
              data.feedStocks.map((feed) => (
                <div key={feed.productId} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-800 text-sm">{feed.productName}</span>
                    {feed.stock < 100 ? <Badge variant="destructive">Rendah</Badge> : <Badge variant="success">Normal</Badge>}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(feed.stock)}
                    <span className="text-sm font-normal text-gray-400 ml-1">{feed.unit}</span>
                  </p>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      Masuk: {formatNumber(feed.purchased)} {feed.unit}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingDown className="w-3 h-3 text-red-400" />
                      Keluar: {formatNumber(feed.used + feed.sold)} {feed.unit}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
