"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Egg, Wheat, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type { FeedStockItem } from "@/services/stock.service";

interface StockData {
  eggStock: number;
  feedStocks: FeedStockItem[];
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

        <Card className={data.eggStock < 500 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Egg className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Stok Telur</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(data.eggStock)}
                  <span className="text-sm font-normal text-gray-400 ml-1">kg</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Total Produksi (kg) − Total Penjualan (kg)</p>
              </div>
              <div>
                {data.eggStock < 500 ? (
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
