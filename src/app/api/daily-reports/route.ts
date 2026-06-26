import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateDailyReportAnalysis } from "@/lib/daily-report-analysis";
import { todayBR } from "@/lib/date-br";

type SkuEntry = { sku_code: string; product_name: string; activities: string[]; observacao: string };
type PendenciaEntry = { sku_code: string; motivo: string };
type PlanejamentoEntry = { sku_code: string; produto: string; atividade: string };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const clientId: number | null = body.client_id ? Number(body.client_id) : null;

  let cliente = "";
  if (clientId) {
    const clientRow = (await query<{ razao_social: string }>(
      `SELECT c.razao_social FROM clients c
       JOIN employee_clients ec ON ec.client_id = c.id
       WHERE c.id = $1 AND ec.employee_id = $2`,
      [clientId, session.userId]
    ))[0];
    if (!clientRow) {
      return NextResponse.json({ error: "Cliente inválido ou não atribuído a você." }, { status: 400 });
    }
    cliente = clientRow.razao_social;
  }

  const skus: SkuEntry[] = (Array.isArray(body.skus) ? body.skus : []).filter(
    (s: SkuEntry) => s.sku_code || s.product_name
  );
  const pendencias: PendenciaEntry[] = (Array.isArray(body.pendencias) ? body.pendencias : []).filter(
    (p: PendenciaEntry) => p.sku_code || p.motivo
  );
  const planejamento: PlanejamentoEntry[] = (Array.isArray(body.planejamento) ? body.planejamento : []).filter(
    (p: PlanejamentoEntry) => p.sku_code || p.produto
  );
  const gargalos: string[] = Array.isArray(body.gargalos) ? body.gargalos : [];
  const gargalosDetalhamento: string = body.gargalos_detalhamento || "";
  const selfScore = body.self_score !== undefined && body.self_score !== null && body.self_score !== ""
    ? Number(body.self_score)
    : null;

  const today = todayBR();

  const analysis = generateDailyReportAnalysis({
    employeeName: session.name,
    date: today,
    cliente,
    skus,
    gargalos,
    gargalosDetalhamento,
    pendenciasCount: pendencias.length,
    selfScore,
  });

  const existing = await query<{ id: number }>(
    `SELECT id FROM daily_reports WHERE employee_id = $1 AND date = $2`,
    [session.userId, today]
  );

  let reportId: number;
  if (existing.length > 0) {
    reportId = existing[0].id;
    await query(
      `UPDATE daily_reports
       SET cliente = $1, client_id = $2, gargalos = $3, gargalos_detalhamento = $4, self_score = $5, ai_analysis = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [cliente || null, clientId, gargalos, gargalosDetalhamento, selfScore, analysis, reportId]
    );
    await query(`DELETE FROM daily_report_skus WHERE daily_report_id = $1`, [reportId]);
    await query(`DELETE FROM daily_report_pendencias WHERE daily_report_id = $1`, [reportId]);
    await query(`DELETE FROM daily_report_planejamento WHERE daily_report_id = $1`, [reportId]);
  } else {
    const inserted = await query<{ id: number }>(
      `INSERT INTO daily_reports (employee_id, date, cliente, client_id, gargalos, gargalos_detalhamento, self_score, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [session.userId, today, cliente || null, clientId, gargalos, gargalosDetalhamento, selfScore, analysis]
    );
    reportId = inserted[0].id;
  }

  for (const s of skus) {
    await query(
      `INSERT INTO daily_report_skus (daily_report_id, sku_code, product_name, activities, observacao)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, s.sku_code || null, s.product_name || null, s.activities || [], s.observacao || null]
    );
  }

  for (const p of pendencias) {
    await query(
      `INSERT INTO daily_report_pendencias (daily_report_id, sku_code, motivo) VALUES ($1, $2, $3)`,
      [reportId, p.sku_code || null, p.motivo || null]
    );
  }

  for (const item of planejamento) {
    await query(
      `INSERT INTO daily_report_planejamento (daily_report_id, sku_code, produto, atividade) VALUES ($1, $2, $3, $4)`,
      [reportId, item.sku_code || null, item.produto || null, item.atividade || null]
    );
  }

  return NextResponse.json({
    ok: true,
    report: {
      date: today,
      employeeName: session.name,
      cliente,
      skus,
      pendencias,
      planejamento,
      gargalos,
      gargalosDetalhamento,
      selfScore,
      analysis,
    },
  });
}
