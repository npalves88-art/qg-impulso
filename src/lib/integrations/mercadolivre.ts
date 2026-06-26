import { query } from "@/lib/db";
import { getIntegration, saveTokens, recordSync, IntegrationRow } from "./store";
import { dateBR, todayBR } from "@/lib/date-br";

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

export async function getValidAccessToken(integration: IntegrationRow): Promise<string> {
  const expiresAtMs = integration.expires_at ? new Date(integration.expires_at).getTime() : 0;
  const isExpiredOrUnknown = !expiresAtMs || Date.now() > expiresAtMs - 60_000;

  if (!isExpiredOrUnknown && integration.access_token) {
    return integration.access_token;
  }

  const refreshed = await refreshAccessToken(integration);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await saveTokens(integration.company_id, "mercado_livre", {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: newExpiresAt,
    seller_id: String(refreshed.user_id),
  });
  return refreshed.access_token;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authedFetch(path: string, accessToken: string, attempt = 1): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    // Transient network failures (e.g. ECONNRESET on cold serverless connections) get one retry.
    if (attempt < 2) {
      await sleep(400);
      return authedFetch(path, accessToken, attempt + 1);
    }
    throw err;
  }
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
      `INSERT INTO ads (product_id, marketplace_id, title, status, health_score, external_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        product.id,
        mlMarketplaceId,
        item.title,
        item.status === "active" ? "ativo" : "pausado",
        item.health ? Math.round(item.health * 100) : 70,
        item.id || null,
      ]
    );
    ad = { id: insertedAd[0].id };
  } else {
    await query(`UPDATE ads SET title = $1, status = $2, external_id = COALESCE($3, external_id) WHERE id = $4`, [
      item.title,
      item.status === "active" ? "ativo" : "pausado",
      item.id || null,
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
  const accessToken = await getValidAccessToken(integration);

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
      const visits = (await authedFetch(`/items/${itemId}/visits/time_window?last=1&unit=day`, accessToken)) as {
        total_visits?: number;
      };
      const today = todayBR();
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
    } catch (err) {
      console.error(`Erro ao buscar visitas do item ${itemId}:`, err);
    }
  }

  let importedOrders = 0;
  try {
    importedOrders = await syncMercadoLivreOrders(companyId);
  } catch (err) {
    console.error("Erro ao sincronizar histórico de pedidos do Mercado Livre:", err);
  }

  let importedAdMetrics = 0;
  try {
    importedAdMetrics = await syncMercadoLivreAdvertising(companyId, accessToken);
  } catch (err) {
    console.error("Erro ao sincronizar métricas de publicidade do Mercado Livre:", err);
  }

  const summary = `${importedAds} anúncio(s), ${importedMetrics} métrica(s), ${importedOrders} pedido(s) e ${importedAdMetrics} métrica(s) de publicidade sincronizados.`;
  await recordSync(companyId, "mercado_livre", summary);
  return { importedAds, importedMetrics, importedOrders, importedAdMetrics, summary };
}

// Mercado Ads / Product Ads metrics (impressions, clicks) for sponsored listings.
// Separate API from the regular items endpoints; only returns data if the seller
// actually runs paid campaigns.
export async function syncMercadoLivreAdvertising(companyId: number, accessToken: string) {
  const advertisersData = (await authedFetch("/advertising/advertisers?product_id=PADS", accessToken)) as {
    advertisers?: { advertiser_id: number }[];
  };
  const advertisers = advertisersData.advertisers || [];
  if (advertisers.length === 0) return 0;

  const today = todayBR();
  let updated = 0;

  for (const advertiser of advertisers) {
    const adsData = (await authedFetch(
      `/advertising/product_ads/ads/search?advertiser_id=${advertiser.advertiser_id}&limit=50`,
      accessToken
    )) as { results?: { item_id: string }[] };

    for (const ad of adsData.results || []) {
      let metrics: any;
      try {
        metrics = await authedFetch(
          `/advertising/product_ads/ads/${ad.item_id}?advertiser_id=${advertiser.advertiser_id}&date_from=${today}&date_to=${today}&metrics_summary=true`,
          accessToken
        );
      } catch (err) {
        console.error(`Erro ao buscar métricas de publicidade do item ${ad.item_id}:`, err);
        continue;
      }

      const summaryMetrics = metrics?.metrics_summary || metrics?.metrics || {};
      const impressions = Number(summaryMetrics.prints || summaryMetrics.impressions || 0);
      const clicks = Number(summaryMetrics.clicks || 0);
      if (!impressions && !clicks) continue;

      const matchedAd = (
        await query<{ id: number }>(
          `SELECT a.id FROM ads a
           JOIN products p ON p.id = a.product_id
           WHERE p.company_id = $1 AND a.external_id = $2 LIMIT 1`,
          [companyId, String(ad.item_id)]
        )
      )[0];
      if (!matchedAd) continue;

      const existingMetric = (
        await query<{ id: number }>(`SELECT id FROM ad_metrics WHERE ad_id = $1 AND date = $2`, [
          matchedAd.id,
          today,
        ])
      )[0];
      if (existingMetric) {
        await query(`UPDATE ad_metrics SET impressions = $1, clicks = $2 WHERE id = $3`, [
          impressions,
          clicks,
          existingMetric.id,
        ]);
      } else {
        await query(
          `INSERT INTO ad_metrics (ad_id, date, impressions, views, visits, clicks, orders, revenue)
           VALUES ($1, $2, $3, 0, 0, $4, 0, 0)`,
          [matchedAd.id, today, impressions, clicks]
        );
      }
      updated++;
    }
  }

  return updated;
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
  const orderIdStr = String(order.id);
  const already = await query<{ id: number }>(
    `SELECT id FROM processed_orders WHERE marketplace = 'mercado_livre' AND external_order_id = $1`,
    [orderIdStr]
  );
  if (already.length > 0) return;

  const orderItem = order.order_items?.[0];
  if (!orderItem) return;

  await query(
    `INSERT INTO processed_orders (marketplace, external_order_id, company_id) VALUES ('mercado_livre', $1, $2)`,
    [orderIdStr, companyId]
  );

  const { adId } = await upsertProductAndAdFromItem(companyId, {
    title: orderItem.item.title,
    price: orderItem.unit_price,
    available_quantity: 0,
    status: "active",
  });

  const date = order.date_created ? String(order.date_created).slice(0, 10) : todayBR();
  const revenue = order.total_amount || orderItem.unit_price * orderItem.quantity;

  const existingMetric = (
    await query<{ id: number }>(`SELECT id FROM ad_metrics WHERE ad_id = $1 AND date = $2`, [adId, date])
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
      [adId, date, revenue]
    );
  }

  if (order.status === "cancelled") {
    const mlMarketplaceId = await getMlMarketplaceId();
    await query(
      `INSERT INTO returns (company_id, product_id, marketplace_id, reason, cost, date) VALUES ($1, NULL, $2, 'Pedido cancelado (Mercado Livre)', $3, $4)`,
      [companyId, mlMarketplaceId, revenue, date]
    );
  }
}

export async function syncMercadoLivreOrders(companyId: number) {
  const integration = await getIntegration(companyId, "mercado_livre");
  if (!integration || !integration.seller_id) {
    throw new Error("Mercado Livre não está conectado.");
  }
  const accessToken = await getValidAccessToken(integration);
  const sellerId = integration.seller_id;

  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
  const limit = 50;
  let offset = 0;
  let imported = 0;

  while (offset < 200) {
    const url =
      `/orders/search?seller=${sellerId}` +
      `&order.date_created.from=${encodeURIComponent(dateFrom.toISOString())}` +
      `&order.date_created.to=${encodeURIComponent(dateTo.toISOString())}` +
      `&limit=${limit}&offset=${offset}`;

    const data = (await authedFetch(url, accessToken)) as { results: any[]; paging?: { total: number } };
    const results = data.results || [];

    for (const order of results) {
      await recordOrderUpdate(companyId, order);
      imported++;
    }

    offset += limit;
    if (results.length < limit) break;
    if (data.paging && offset >= data.paging.total) break;
  }

  return imported;
}

export async function recordQuestionAsAlert(companyId: number, question: any) {
  await query(
    `INSERT INTO alerts (company_id, type, severity, message, resolved) VALUES ($1, 'pergunta', 'media', $2, 0)`,
    [companyId, `Nova pergunta no Mercado Livre: "${question.text}"`]
  );
}
