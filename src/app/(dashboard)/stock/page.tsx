"use client";

import { useState, useEffect } from "react";
import { Egg, Wheat, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import type { FeedStockItem } from "@/services/stock.service";

interface StockData {
  eggStock: number;
  feedStocks: FeedStockItem[];
}

export default function StockPage() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch("/api/v1/stock");
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <MobileHeader title="Stok" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Ringkasan Stok</h2>
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Egg Stock Card */}
        <Card className={loading ? "" : (data?.eggStock ?? 0) < 500 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Egg className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Stok Telur</span>
                </div>
                {loading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">
                    {formatNumber(data?.eggStock ?? 0)}
                    <span className="text-sm font-normal text-gray-400 ml-1">butir</span>
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">Total Produksi − Total Penjualan</p>
              </div>
              {!loading && (
                <div>
                  {(data?.eggStock ?? 0) < 500 ? (
                    <Badge variant="destructive">Rendah</Badge>
                  ) : (
                    <Badge variant="success">Normal</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feed Stocks */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wheat className="w-4 h-4 text-amber-600" />
              Stok Pakan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </>
            ) : !data?.feedStocks || data.feedStocks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Belum ada produk pakan terdaftar
              </p>
            ) : (
              data.feedStocks.map((feed) => (
                <div key={feed.productId} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-800 text-sm">{feed.productName}</span>
                    {feed.stock < 100 ? (
                      <Badge variant="destructive">Rendah</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
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
