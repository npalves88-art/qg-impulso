import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getIntegration, saveTokens, setStatus } from "@/lib/integrations/store";
import { exchangeCodeForToken } from "@/lib/integrations/mercadolivre";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam || !code) {
    await setStatus(session.companyId, "mercado_livre", "erro");
    return NextResponse.redirect(
      new URL("/configuracoes?tab=integracoes&error=autorizacao_negada", req.url)
    );
  }

  const integration = await getIntegration(session.companyId, "mercado_livre");
  if (!integration?.client_id || !integration?.client_secret) {
    return NextResponse.redirect(
      new URL("/configuracoes?tab=integracoes&error=credenciais_ausentes", req.url)
    );
  }

  try {
    const redirectUri = new URL("/api/integrations/mercadolivre/callback", req.url).toString();
    const tokenData = await exchangeCodeForToken({
      clientId: integration.client_id,
      clientSecret: integration.client_secret,
      code,
      redirectUri,
    });

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    await saveTokens(session.companyId, "mercado_livre", {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      seller_id: String(tokenData.user_id),
    });

    return NextResponse.redirect(new URL("/configuracoes?tab=integracoes&connected=mercado_livre", req.url));
  } catch (err: any) {
    await setStatus(session.companyId, "mercado_livre", "erro");
    return NextResponse.redirect(
      new URL(`/configuracoes?tab=integracoes&error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
