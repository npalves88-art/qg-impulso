import { getSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AlterarSenhaPage() {
  const session = await getSession();

  return (
    <div>
      <PageHeader
        title="Alterar Senha"
        subtitle={`Atualize a senha de acesso de ${session?.name ?? "sua conta"}.`}
      />
      <ChangePasswordForm />
    </div>
  );
}
