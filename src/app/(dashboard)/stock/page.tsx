import { getCachedEggStockBreakdown, getCachedFeedStock } from "@/lib/cache";
import { getTodayCrackedEggs } from "@/services/production.service";
import StockClient from "./_client";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [eggStock, feedStocks, todayCrackedEggs] = await Promise.all([
    getCachedEggStockBreakdown(),
    getCachedFeedStock(),
    getTodayCrackedEggs(),
  ]);
  return <StockClient initialData={{ eggStock, feedStocks, todayCrackedEggs }} />;
}
