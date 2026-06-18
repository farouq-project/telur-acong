import { getProductions } from "@/services/production.service";
import { getHouses } from "@/services/house.service";
import { getFeedProducts } from "@/services/feed.service";
import ProductionClient from "./_client";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const [{ data }, houses, rawFeedProducts] = await Promise.all([
    getProductions({ limit: 5000 }),
    getHouses(),
    getFeedProducts(),
  ]);

  const feedProducts = rawFeedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    createdAt: p.createdAt.toISOString(),
  }));

  return <ProductionClient initialData={data} houses={houses} feedProducts={feedProducts} />;
}
