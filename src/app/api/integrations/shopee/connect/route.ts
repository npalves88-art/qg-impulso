import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getIntegration, setStatus } from "@/lib/integrations/store";
import { getAuthUrl } from "@/lib/integrations/shopee";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const integration = await getIntegration(session.companyId, "shopee");
  if (!integration?.client_id || !integration?.client_secret) {
    return NextResponse.redirect(
      new URL("/configuracoes?tab=integracoes&error=credenciais_ausentes", req.url)
    );
  }

  const redirectUri = new URL("/api/integrations/shopee/callback", req.url).toString();
  const authUrl = getAuthUrl(integration.client_id, integration.client_secret, redirectUri);

  await setStatus(session.companyId, "shopee", "aguardando_autorizacao");
  return NextResponse.redirect(authUrl);
}
