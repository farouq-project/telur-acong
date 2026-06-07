import { getCachedEggStock, getCachedFeedStock } from "@/lib/cache";
import StockClient from "./_client";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [eggStock, feedStocks] = await Promise.all([
    getCachedEggStock(),
    getCachedFeedStock(),
  ]);
  return <StockClient initialData={{ eggStock, feedStocks }} />;
}
