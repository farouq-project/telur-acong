import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BottomNav } from "@/components/layout/BottomNav";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleGuard />
      <main className="pt-14 content-with-nav">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
