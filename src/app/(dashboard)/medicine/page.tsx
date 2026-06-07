import { getMedicines } from "@/services/medicine.service";
import MedicineClient from "./_client";

export const dynamic = "force-dynamic";

export default async function MedicinePage() {
  const { data } = await getMedicines({ limit: 50 });
  return <MedicineClient initialData={data} />;
}
