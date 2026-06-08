import { getProductions } from "@/services/production.service";
import { getHouses } from "@/services/house.service";
import ProductionClient from "./_client";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const [{ data }, houses] = await Promise.all([
    getProductions({ limit: 50 }),
    getHouses(),
  ]);
  return <ProductionClient initialData={data} houses={houses} />;
}
