import { query } from "@/lib/db";
import { getIntegration, saveTokens, recordSync, IntegrationRow } from "./store";

const AUTH_BASE = "https://auth.mercadolivre.com.br/authorization";
const API_BASE = "https://api.mercadolibre.com";

export function getAuthUrl(clientId: string, redirectUri: string, state: string) {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao obter token do Mercado Livre: ${res.status} ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    user_id: number;
    refresh_token?: string;
  }>;
}

export async function refreshAccessToken(integration: IntegrationRow) {
  if (!integration.client_id || !integration.client_secret || !integration.refresh_token) {
    throw new Error("Credenciais ou refresh_token ausentes para Mercado Livre.");
  }
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: integration.client_id,
      client_secret: integration.client_secret,
      refresh_token: integration.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao renovar token do Mercado Livre: ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user_id: number }>;
}

async function authedFetch(path: string, accessToken: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Erro ao consultar Mercado Livre (${path}): ${res.status}`);
  return res.json();
}

async function getMlMarketplaceId() {
  const rows = await query<{ id: number }>(`SELECT id FROM marketplaces WHERE name = 'Mercado Livre'`);
  return rows[0].id;
}

export async function upsertProductAndAdFromItem(companyId: number, item: any) {
  const mlMarketplaceId = await getMlMarketplaceId();

  let product = (
    await query<{ id: number }>(`SELECT id FROM products WHERE company_id = $1 AND name = $2`, [companyId, item.title])
  )[0];

  if (!product) {
    const inserted = await query<{ id: number }>(
      `INSERT INTO products (company_id, name, category, cost_price, sale_price, stock, curve, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'B', 'ativo') RETURNING id`,
      [companyId, item.title, item.category_id || "Importado ML", 0, item.price || 0, item.available_quantity || 0]
    );
    product = { id: inserted[0].id };
  } else {
    await query(`UPDATE products SET sale_price = $1, stock = $2 WHERE id = $3`, [
      item.price || 0,
      item.available_quantity || 0,
      product.id,
    ]);
  }

  let ad = (
    await query<{ id: number }>(`SELECT id FROM ads WHERE product_id = $1 AND marketplace_id = $2`, [product.id, mlMarketplaceId])
  )[0];

  if (!ad) {
    const insertedAd = await query<{ id: number }>(
      `INSERT INTO ads (product_id, marketplace_id, title, status, health_score) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [product.id, mlMarketplaceId, item.title, item.status === "active" ? "ativo" : "pausado", item.health ? Math.round(item.health * 100) : 70]
    );
    ad = { id: insertedAd[0].id };
  } else {
    await query(`UPDATE ads SET title = $1, status = $2 WHERE id = $3`, [
      item.title,
      item.status === "active" ? "ativo" : "pausado",
      ad.id,
    ]);
  }

  return { productId: product.id, adId: ad.id };
}

export async function syncMercadoLivre(companyId: number) {
  const integration = await getIntegration(companyId, "mercado_livre");
  if (!integration || !integration.access_token || !integration.seller_id) {
    throw new Error("Mercado Livre não está conectado. Conclua a autorização antes de sincronizar.");
  }

  const sellerId = integration.seller_id;
  const accessToken = integration.access_token;

  const itemsSearch = (await authedFetch(`/users/${sellerId}/items/search?status=active&limit=50`, accessToken)) as {
    results: string[];
  };

  let importedAds = 0;
  let importedMetrics = 0;

  for (const itemId of itemsSearch.results || []) {
    const item = (await authedFetch(`/items/${itemId}`, accessToken)) as any;
    const { adId } = await upsertProductAndAdFromItem(companyId, item);
    importedAds++;

    try {
      const visits = (await authedFetch(`/items/${itemId}/visits?last=1&unit=day`, accessToken)) as { total_visits?: number };
      const today = new Date().toISOString().slice(0, 10);
      const existingMetric = (
        await query<{ id: number }>(`SELECT id FROM ad_metrics WHERE ad_id = $1 AND date = $2`, [adId, today])
      )[0];

      const visitCount = visits.total_visits || 0;
      if (existingMetric) {
        await query(`UPDATE ad_metrics SET visits = $1 WHERE id = $2`, [visitCount, existingMetric.id]);
      } else {
        await query(
          `INSERT INTO ad_metrics (ad_id, date, impressions, views, visits, clicks, orders, revenue)
           VALUES ($1, $2, 0, 0, $3, 0, 0, 0)`,
          [adId, today, visitCount]
        );
      }
      importedMetrics++;
    } catch {
      // visits endpoint may be unavailable for some item types; continue sync
    }
  }

  const summary = `${importedAds} anúncio(s) e ${importedMetrics} métrica(s) sincronizados.`;
  await recordSync(companyId, "mercado_livre", summary);
  return { importedAds, importedMetrics, summary };
}

export async function fetchItem(accessToken: string, itemId: string) {
  return authedFetch(`/items/${itemId}`, accessToken);
}

export async function fetchOrder(accessToken: string, orderId: string) {
  return authedFetch(`/orders/${orderId}`, accessToken);
}

export async function fetchQuestion(accessToken: string, questionId: string) {
  return authedFetch(`/questions/${questionId}`, accessToken);
}

export async function getIntegrationBySellerId(sellerId: string) {
  const rows = await query<IntegrationRow>(
    `SELECT * FROM marketplace_integrations WHERE marketplace = 'mercado_livre' AND seller_id = $1`,
    [sellerId]
  );
  return rows[0];
}

export async function recordOrderUpdate(companyId: number, order: any) {
  const orderItem = order.order_items?.[0];
  if (!orderItem) return;

  const { adId } = await upsertProductAndAdFromItem(companyId, {
    title: orderItem.item.title,
    price: orderItem.unit_price,
    available_quantity: 0,
    status: "active",
  });

  const today = new Date().toISOString().slice(0, 10);
  const revenue = order.total_amount || orderItem.unit_price * orderItem.quantity;

  const existingMetric = (
    await query<{ id: number }>(`SELECT id FROM ad_metrics WHERE ad_id = $1 AND date = $2`, [adId, today])
  )[0];

  if (existingMetric) {
    await query(`UPDATE ad_metrics SET orders = orders + 1, revenue = revenue + $1 WHERE id = $2`, [
      revenue,
      existingMetric.id,
    ]);
  } else {
    await query(
      `INSERT INTO ad_metrics (ad_id, date, impressions, views, visits, clicks, orders, revenue)
       VALUES ($1, $2, 0, 0, 0, 0, 1, $3)`,
      [adId, today, revenue]
    );
  }

  if (order.status === "cancelled") {
    const mlMarketplaceId = await getMlMarketplaceId();
    await query(
      `INSERT INTO returns (company_id, product_id, marketplace_id, reason, cost, date) VALUES ($1, NULL, $2, 'Pedido cancelado (Mercado Livre)', $3, $4)`,
      [companyId, mlMarketplaceId, revenue, today]
    );
  }
}

export async function recordQuestionAsAlert(companyId: number, question: any) {
  await query(
    `INSERT INTO alerts (company_id, type, severity, message, resolved) VALUES ($1, 'pergunta', 'media', $2, 0)`,
    [companyId, `Nova pergunta no Mercado Livre: "${question.text}"`]
  );
}
