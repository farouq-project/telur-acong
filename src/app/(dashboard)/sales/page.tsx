import { getSales } from "@/services/sales.service";
import SalesClient from "./_client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { data } = await getSales({ limit: 50 });
  return <SalesClient initialData={data} />;
}
