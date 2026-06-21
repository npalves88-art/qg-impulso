import { getIntegration } from "./store";
import { syncMercadoLivre } from "./mercadolivre";

const STALE_AFTER_MS = 10 * 60 * 1000;

export async function autoSyncMercadoLivreIfStale(companyId: number) {
  try {
    const integration = await getIntegration(companyId, "mercado_livre");
    if (!integration || integration.status !== "conectado") return;

    const lastSync = integration.last_sync_at ? new Date(integration.last_sync_at).getTime() : 0;
    if (Date.now() - lastSync < STALE_AFTER_MS) return;

    await syncMercadoLivre(companyId);
  } catch {
    // Best-effort background freshness check; page should still render with existing data on failure.
  }
}
