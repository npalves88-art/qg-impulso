import { getSession } from "@/lib/auth";
import { getCompany, getEmployees, getProducts, getUsers } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await getSession();
  const company = await getCompany(session!.companyId);
  const employees = await getEmployees(session!.companyId);
  const products = await getProducts(session!.companyId);
  const users = await getUsers(session!.companyId);

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Cadastro de empresa, equipe, produtos e usuários."
      />
      <SettingsClient
        company={company}
        employees={employees}
        products={products}
        users={users}
        currentUser={{ name: session!.name, role: session!.role, email: session!.email }}
      />
    </div>
  );
}
