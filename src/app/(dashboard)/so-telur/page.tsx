import { getSoTelurDaily } from "@/services/production.service";
import SoTelurClient from "./_client";

export const dynamic = "force-dynamic";

export default async function SoTelurPage() {
  const data = await getSoTelurDaily();
  return <SoTelurClient initialData={data} />;
}
