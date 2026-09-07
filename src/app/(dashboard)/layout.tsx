import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BottomNav } from "@/components/layout/BottomNav";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { BusinessSettingsProvider } from "@/components/layout/BusinessSettingsProvider";
import { getCachedBusinessSettings } from "@/lib/cache";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, settings] = await Promise.all([
    getServerSession(authOptions),
    getCachedBusinessSettings(),
  ]);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleGuard />
      <BusinessSettingsProvider value={settings}>
        <main className="pt-14 content-with-nav">
          {children}
        </main>
      </BusinessSettingsProvider>
      <BottomNav />
    </div>
  );
}
