import { getHouses } from "@/services/house.service";
import KandangClient from "./_client";

export const dynamic = "force-dynamic";

export default async function KandangPage() {
  const houses = await getHouses();
  return <KandangClient initialData={houses} />;
}
