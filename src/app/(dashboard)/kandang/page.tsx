import { getHouses } from "@/services/house.service";
import { getAfkirLogByHouse } from "@/services/production.service";
import KandangClient from "./_client";

export const dynamic = "force-dynamic";

export default async function KandangPage() {
  const [houses, afkirLog] = await Promise.all([
    getHouses(),
    getAfkirLogByHouse(),
  ]);
  return <KandangClient initialData={houses} afkirLog={afkirLog} />;
}
