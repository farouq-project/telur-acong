import { getMortalities } from "@/services/mortality.service";
import MortalityClient from "./_client";

export const dynamic = "force-dynamic";

export default async function MortalityPage() {
  const { data } = await getMortalities({ limit: 50 });
  return <MortalityClient initialData={data} />;
}
