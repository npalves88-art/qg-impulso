import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompany } from "@/lib/queries";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await getCompany(session.companyId);

  return (
    <div className="flex min-h-screen bg-[#0F0F10]">
      <Sidebar
        user={{ name: session.name, role: session.role, avatarColor: session.avatarColor }}
        logoUrl={company?.logo_url || null}
      />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8">{children}</main>
    </div>
  );
}
