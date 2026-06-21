import { NextRequest, NextResponse } from "next/server";
import {
  fetchItem,
  fetchOrder,
  fetchQuestion,
  getIntegrationBySellerId,
  getValidAccessToken,
  upsertProductAndAdFromItem,
  recordOrderUpdate,
  recordQuestionAsAlert,
} from "@/lib/integrations/mercadolivre";

// Mercado Livre calls this with no user session — must respond fast (<500ms) or the webhook gets disabled.
// We respond 200 immediately and process the resource update in the background.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { topic, resource, user_id } = body || {};

  // Fire-and-forget; do not await before responding.
  process.nextTick(() => {
    handleNotification(topic, resource, user_id).catch((err) => {
      console.error("Erro ao processar notificação do Mercado Livre:", err);
    });
  });

  return NextResponse.json({ ok: true });
}

async function handleNotification(topic: string, resource: string, userId: number | string) {
  if (!topic || !resource || !userId) return;

  const integration = await getIntegrationBySellerId(String(userId));
  if (!integration || !integration.access_token) return;

  const companyId = integration.company_id;
  const accessToken = await getValidAccessToken(integration);
  const resourceId = resource.split("/").pop();
  if (!resourceId) return;

  switch (topic) {
    case "items": {
      const item = await fetchItem(accessToken, resourceId);
      await upsertProductAndAdFromItem(companyId, item);
      break;
    }
    case "orders_v2": {
      const order = await fetchOrder(accessToken, resourceId);
      await recordOrderUpdate(companyId, order);
      break;
    }
    case "questions": {
      const question = await fetchQuestion(accessToken, resourceId);
      await recordQuestionAsAlert(companyId, question);
      break;
    }
    default:
      break;
  }
}
