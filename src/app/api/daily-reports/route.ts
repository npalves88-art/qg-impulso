import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

type SkuEntry = { sku_code: string; product_name: string; activities: string[]; observacao: string };
type PendenciaEntry = { sku_code: string; motivo: string };
type PlanejamentoEntry = { sku_code: string; produto: string; atividade: string };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const skus: SkuEntry[] = Array.isArray(body.skus) ? body.skus : [];
  const pendencias: PendenciaEntry[] = Array.isArray(body.pendencias) ? body.pendencias : [];
  const planejamento: PlanejamentoEntry[] = Array.isArray(body.planejamento) ? body.planejamento : [];
  const gargalos: string[] = Array.isArray(body.gargalos) ? body.gargalos : [];
  const gargalosDetalhamento: string = body.gargalos_detalhamento || "";
  const selfScore = body.self_score !== undefined && body.self_score !== null && body.self_score !== ""
    ? Number(body.self_score)
    : null;

  const today = new Date().toISOString().slice(0, 10);

  const existing = await query<{ id: number }>(
    `SELECT id FROM daily_reports WHERE employee_id = $1 AND date = $2`,
    [session.userId, today]
  );

  let reportId: number;
  if (existing.length > 0) {
    reportId = existing[0].id;
    await query(
      `UPDATE daily_reports SET gargalos = $1, gargalos_detalhamento = $2, self_score = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [gargalos, gargalosDetalhamento, selfScore, reportId]
    );
    await query(`DELETE FROM daily_report_skus WHERE daily_report_id = $1`, [reportId]);
    await query(`DELETE FROM daily_report_pendencias WHERE daily_report_id = $1`, [reportId]);
    await query(`DELETE FROM daily_report_planejamento WHERE daily_report_id = $1`, [reportId]);
  } else {
    const inserted = await query<{ id: number }>(
      `INSERT INTO daily_reports (employee_id, date, gargalos, gargalos_detalhamento, self_score)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [session.userId, today, gargalos, gargalosDetalhamento, selfScore]
    );
    reportId = inserted[0].id;
  }

  for (const s of skus) {
    if (!s.sku_code && !s.product_name) continue;
    await query(
      `INSERT INTO daily_report_skus (daily_report_id, sku_code, product_name, activities, observacao)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, s.sku_code || null, s.product_name || null, s.activities || [], s.observacao || null]
    );
  }

  for (const p of pendencias) {
    if (!p.sku_code && !p.motivo) continue;
    await query(
      `INSERT INTO daily_report_pendencias (daily_report_id, sku_code, motivo) VALUES ($1, $2, $3)`,
      [reportId, p.sku_code || null, p.motivo || null]
    );
  }

  for (const item of planejamento) {
    if (!item.sku_code && !item.produto) continue;
    await query(
      `INSERT INTO daily_report_planejamento (daily_report_id, sku_code, produto, atividade) VALUES ($1, $2, $3, $4)`,
      [reportId, item.sku_code || null, item.produto || null, item.atividade || null]
    );
  }

  return NextResponse.json({ ok: true });
}
