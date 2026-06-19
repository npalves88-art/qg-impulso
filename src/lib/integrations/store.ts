import { query } from "@/lib/db";

export type MarketplaceKey = "mercado_livre" | "shopee";

export type IntegrationRow = {
  id: number;
  company_id: number;
  marketplace: MarketplaceKey;
  client_id: string | null;
  client_secret: string | null;
  shop_id: string | null;
  seller_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  status: "desconectado" | "aguardando_autorizacao" | "conectado" | "erro";
  last_sync_at: string | null;
  last_sync_summary: string | null;
};

export async function getIntegration(companyId: number, marketplace: MarketplaceKey): Promise<IntegrationRow | undefined> {
  const rows = await query<IntegrationRow>(
    `SELECT * FROM marketplace_integrations WHERE company_id = $1 AND marketplace = $2`,
    [companyId, marketplace]
  );
  return rows[0];
}

export async function listIntegrations(companyId: number): Promise<IntegrationRow[]> {
  return query<IntegrationRow>(`SELECT * FROM marketplace_integrations WHERE company_id = $1`, [companyId]);
}

export async function upsertCredentials(
  companyId: number,
  marketplace: MarketplaceKey,
  fields: Partial<Pick<IntegrationRow, "client_id" | "client_secret" | "shop_id" | "seller_id">>
) {
  const existing = await getIntegration(companyId, marketplace);
  if (existing) {
    await query(
      `UPDATE marketplace_integrations
       SET client_id = $1, client_secret = $2, shop_id = $3, status = 'desconectado'
       WHERE id = $4`,
      [fields.client_id ?? existing.client_id, fields.client_secret ?? existing.client_secret, fields.shop_id ?? existing.shop_id, existing.id]
    );
  } else {
    await query(
      `INSERT INTO marketplace_integrations (company_id, marketplace, client_id, client_secret, shop_id, status)
       VALUES ($1, $2, $3, $4, $5, 'desconectado')`,
      [companyId, marketplace, fields.client_id ?? null, fields.client_secret ?? null, fields.shop_id ?? null]
    );
  }
}

export async function saveTokens(
  companyId: number,
  marketplace: MarketplaceKey,
  tokens: { access_token: string; refresh_token?: string; expires_at: string; seller_id?: string; shop_id?: string }
) {
  await query(
    `UPDATE marketplace_integrations
     SET access_token = $1, refresh_token = COALESCE($2, refresh_token), expires_at = $3,
         seller_id = COALESCE($4, seller_id), shop_id = COALESCE($5, shop_id), status = 'conectado'
     WHERE company_id = $6 AND marketplace = $7`,
    [
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokens.expires_at,
      tokens.seller_id ?? null,
      tokens.shop_id ?? null,
      companyId,
      marketplace,
    ]
  );
}

export async function setStatus(companyId: number, marketplace: MarketplaceKey, status: IntegrationRow["status"]) {
  await query(
    `UPDATE marketplace_integrations SET status = $1 WHERE company_id = $2 AND marketplace = $3`,
    [status, companyId, marketplace]
  );
}

export async function recordSync(companyId: number, marketplace: MarketplaceKey, summary: string) {
  await query(
    `UPDATE marketplace_integrations SET last_sync_at = $1, last_sync_summary = $2 WHERE company_id = $3 AND marketplace = $4`,
    [new Date().toISOString(), summary, companyId, marketplace]
  );
}
