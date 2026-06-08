import { getCachedEggStockBreakdown, getCachedFeedStock } from "@/lib/cache";
import StockClient from "./_client";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [eggStock, feedStocks] = await Promise.all([
    getCachedEggStockBreakdown(),
    getCachedFeedStock(),
  ]);
  return <StockClient initialData={{ eggStock, feedStocks }} />;
}
