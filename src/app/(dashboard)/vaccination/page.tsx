import { getVaccinationSchedules } from "@/services/vaccination.service";
import VaccinationClient from "./_client";

export const dynamic = "force-dynamic";

export default async function VaccinationPage() {
  const data = await getVaccinationSchedules({ includeDone: false });
  return <VaccinationClient initialData={data} />;
}
