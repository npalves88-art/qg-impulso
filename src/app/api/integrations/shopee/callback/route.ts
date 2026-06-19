import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getIntegration, saveTokens, setStatus } from "@/lib/integrations/store";
import { exchangeCodeForToken } from "@/lib/integrations/shopee";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const shopId = req.nextUrl.searchParams.get("shop_id");

  if (!code || !shopId) {
    await setStatus(session.companyId, "shopee", "erro");
    return NextResponse.redirect(
      new URL("/configuracoes?tab=integracoes&error=autorizacao_negada", req.url)
    );
  }

  const integration = await getIntegration(session.companyId, "shopee");
  if (!integration?.client_id || !integration?.client_secret) {
    return NextResponse.redirect(
      new URL("/configuracoes?tab=integracoes&error=credenciais_ausentes", req.url)
    );
  }

  try {
    const tokenData = await exchangeCodeForToken({
      partnerId: integration.client_id,
      partnerKey: integration.client_secret,
      code,
      shopId,
    });

    if (tokenData.error) {
      throw new Error(tokenData.message || tokenData.error);
    }

    const expiresAt = new Date(Date.now() + tokenData.expire_in * 1000).toISOString();
    await saveTokens(session.companyId, "shopee", {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      shop_id: shopId,
    });

    return NextResponse.redirect(new URL("/configuracoes?tab=integracoes&connected=shopee", req.url));
  } catch (err: any) {
    await setStatus(session.companyId, "shopee", "erro");
    return NextResponse.redirect(
      new URL(`/configuracoes?tab=integracoes&error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
