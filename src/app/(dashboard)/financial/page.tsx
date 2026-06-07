import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFinancialNotes, getFinancialSummary } from "@/services/financial.service";
import FinancialClient from "./_client";

export const dynamic = "force-dynamic";

export default async function FinancialPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/dashboard");

  const [result, summary] = await Promise.all([
    getFinancialNotes({ limit: 100 }),
    getFinancialSummary(),
  ]);

  return (
    <FinancialClient
      initialData={result.data}
      initialSummary={summary}
    />
  );
}
