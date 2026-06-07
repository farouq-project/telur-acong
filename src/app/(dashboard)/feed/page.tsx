import {
  getFeedProducts,
  getFeedPurchases,
  getFeedUsages,
  getFeedSales,
} from "@/services/feed.service";
import FeedClient from "./_client";
import type { FeedPurchase, FeedUsage, FeedSale } from "@/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const [rawProducts, purchases, usages, feedSales] = await Promise.all([
    getFeedProducts(),
    getFeedPurchases({ limit: 50 }),
    getFeedUsages({ limit: 50 }),
    getFeedSales({ limit: 50 }),
  ]);

  const products = rawProducts.map((p: { id: string; name: string; unit: string; createdAt: Date }) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <FeedClient
      initialProducts={products}
      initialPurchases={purchases as unknown as FeedPurchase[]}
      initialUsages={usages as unknown as FeedUsage[]}
      initialFeedSales={feedSales as unknown as FeedSale[]}
    />
  );
}
