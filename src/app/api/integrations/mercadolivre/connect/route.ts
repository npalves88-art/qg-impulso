import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getIntegration, setStatus } from "@/lib/integrations/store";
import { getAuthUrl } from "@/lib/integrations/mercadolivre";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const integration = await getIntegration(session.companyId, "mercado_livre");
  if (!integration?.client_id) {
    return NextResponse.redirect(
      new URL("/configuracoes?tab=integracoes&error=credenciais_ausentes", req.url)
    );
  }

  const redirectUri = new URL("/api/integrations/mercadolivre/callback", req.url).toString();
  const authUrl = getAuthUrl(integration.client_id, redirectUri, String(session.companyId));

  await setStatus(session.companyId, "mercado_livre", "aguardando_autorizacao");
  return NextResponse.redirect(authUrl);
}
