import { getProductions } from "@/services/production.service";
import ProductionClient from "./_client";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const { data } = await getProductions({ limit: 50 });
  return <ProductionClient initialData={data} />;
}
