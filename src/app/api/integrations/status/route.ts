import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listIntegrations } from "@/lib/integrations/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const list = await listIntegrations(session.companyId);
  const integrations = list.map((i) => ({
    marketplace: i.marketplace,
    status: i.status,
    hasCredentials: Boolean(i.client_id && i.client_secret),
    shopId: i.shop_id,
    sellerId: i.seller_id,
    lastSyncAt: i.last_sync_at,
    lastSyncSummary: i.last_sync_summary,
  }));

  return NextResponse.json({ integrations });
}
