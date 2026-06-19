import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { upsertCredentials, MarketplaceKey } from "@/lib/integrations/store";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { marketplace, client_id, client_secret, shop_id } = await req.json();
  if (!marketplace || !["mercado_livre", "shopee"].includes(marketplace)) {
    return NextResponse.json({ error: "Marketplace inválido." }, { status: 400 });
  }
  if (!client_id || !client_secret) {
    return NextResponse.json({ error: "Informe Client ID e Client Secret." }, { status: 400 });
  }

  await upsertCredentials(session.companyId, marketplace as MarketplaceKey, {
    client_id,
    client_secret,
    shop_id: shop_id || null,
  });

  return NextResponse.json({ ok: true });
}
