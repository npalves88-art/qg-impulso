import crypto from "crypto";
import { query } from "@/lib/db";
import { getIntegration, recordSync, IntegrationRow } from "./store";

const API_HOST = "https://partner.shopeemobile.com";

function sign(partnerKey: string, baseString: string) {
  return crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
}

export function getAuthUrl(partnerId: string, partnerKey: string, redirectUri: string) {
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const signature = sign(partnerKey, baseString);

  const url = new URL(`${API_HOST}${path}`);
  url.searchParams.set("partner_id", partnerId);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", signature);
  url.searchParams.set("redirect", redirectUri);
  return url.toString();
}

export async function exchangeCodeForToken(params: {
  partnerId: string;
  partnerKey: string;
  code: string;
  shopId: string;
}) {
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${params.partnerId}${path}${timestamp}`;
  const signature = sign(params.partnerKey, baseString);

  const url = new URL(`${API_HOST}${path}`);
  url.searchParams.set("partner_id", params.partnerId);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", signature);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: params.code, shop_id: Number(params.shopId), partner_id: Number(params.partnerId) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao obter token da Shopee: ${res.status} ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expire_in: number;
    error?: string;
    message?: string;
  }>;
}

export async function refreshAccessToken(integration: IntegrationRow) {
  if (!integration.client_id || !integration.client_secret || !integration.refresh_token || !integration.shop_id) {
    throw new Error("Credenciais ou refresh_token ausentes para Shopee.");
  }
  const path = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${integration.client_id}${path}${timestamp}`;
  const signature = sign(integration.client_secret, baseString);

  const url = new URL(`${API_HOST}${path}`);
  url.searchParams.set("partner_id", integration.client_id);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", signature);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: integration.refresh_token,
      shop_id: Number(integration.shop_id),
      partner_id: Number(integration.client_id),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao renovar token da Shopee: ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expire_in: number }>;
}

async function shopAuthedRequest(
  path: string,
  integration: IntegrationRow,
  query: Record<string, string> = {}
) {
  if (!integration.client_id || !integration.client_secret || !integration.access_token || !integration.shop_id) {
    throw new Error("Shopee não está completamente conectada.");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${integration.client_id}${path}${timestamp}${integration.access_token}${integration.shop_id}`;
  const signature = sign(integration.client_secret, baseString);

  const url = new URL(`${API_HOST}${path}`);
  url.searchParams.set("partner_id", integration.client_id);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", signature);
  url.searchParams.set("access_token", integration.access_token);
  url.searchParams.set("shop_id", integration.shop_id);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Erro ao consultar Shopee (${path}): ${res.status}`);
  return res.json();
}

export async function syncShopee(companyId: number) {
  const integration = await getIntegration(companyId, "shopee");
  if (!integration || integration.status !== "conectado") {
    throw new Error("Shopee não está conectada. Conclua a autorização antes de sincronizar.");
  }

  const itemList = (await shopAuthedRequest("/api/v2/product/get_item_list", integration, {
    offset: "0",
    page_size: "50",
    item_status: "NORMAL",
  })) as { response?: { item: { item_id: number }[] } };

  const shopeeMarketplaceRows = await query<{ id: number }>(`SELECT id FROM marketplaces WHERE name = 'Shopee'`);
  const shopeeMarketplace = shopeeMarketplaceRows[0];

  const items = itemList.response?.item || [];
  let importedAds = 0;

  if (items.length > 0) {
    const itemIds = items.map((i) => i.item_id).join(",");
    const baseInfo = (await shopAuthedRequest("/api/v2/product/get_item_base_info", integration, {
      item_id_list: itemIds,
    })) as { response?: { item_list: any[] } };

    for (const item of baseInfo.response?.item_list || []) {
      let product = (
        await query<{ id: number }>(`SELECT id FROM products WHERE company_id = $1 AND name = $2`, [companyId, item.item_name])
      )[0];

      if (!product) {
        const inserted = await query<{ id: number }>(
          `INSERT INTO products (company_id, name, category, cost_price, sale_price, stock, curve, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'B', 'ativo') RETURNING id`,
          [
            companyId,
            item.item_name,
            "Importado Shopee",
            0,
            item.price_info?.[0]?.current_price || 0,
            item.stock_info_v2?.summary_info?.total_available_stock || 0,
          ]
        );
        product = { id: inserted[0].id };
      }

      const ad = (
        await query<{ id: number }>(`SELECT id FROM ads WHERE product_id = $1 AND marketplace_id = $2`, [product.id, shopeeMarketplace.id])
      )[0];

      if (!ad) {
        await query(
          `INSERT INTO ads (product_id, marketplace_id, title, status, health_score) VALUES ($1, $2, $3, $4, $5)`,
          [product.id, shopeeMarketplace.id, item.item_name, item.item_status === "NORMAL" ? "ativo" : "pausado", 70]
        );
      } else {
        await query(`UPDATE ads SET title = $1, status = $2 WHERE id = $3`, [
          item.item_name,
          item.item_status === "NORMAL" ? "ativo" : "pausado",
          ad.id,
        ]);
      }
      importedAds++;
    }
  }

  const summary = `${importedAds} anúncio(s) sincronizados da Shopee.`;
  await recordSync(companyId, "shopee", summary);
  return { importedAds, summary };
}
