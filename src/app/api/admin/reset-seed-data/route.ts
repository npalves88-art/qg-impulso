import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const SEED_PRODUCT_NAMES = [
  "Luminária de Mesa LED",
  "Fone Bluetooth TWS",
  "Organizador Multiuso",
  "Kit Pincéis de Maquiagem",
  "Furadeira Parafusadeira 12V",
  "Comedouro Automático Pet",
  "Garrafa Térmica 1L",
  "Suporte para Celular Veicular",
  "Mini Ventilador Portátil",
  "Capa para Notebook 15.6",
  "Tapete Antiderrapante Banheiro",
  "Kit Ferramentas 50 Peças",
  "Carregador Portátil 10000mAh",
  "Cinto de Academia Lombar",
  "Aspirador Pó Portátil",
  "Câmera de Segurança Wi-Fi",
  "Relógio Inteligente Smartwatch",
  "Mochila Notebook Impermeável",
  "Air Fryer 4L",
  "Caixa de Som Bluetooth",
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem executar esta ação." }, { status: 403 });
  }

  const companyId = session.companyId;

  const seedProducts = await query<{ id: number }>(
    `SELECT id FROM products WHERE company_id = $1 AND name = ANY($2)`,
    [companyId, SEED_PRODUCT_NAMES]
  );
  const seedProductIds = seedProducts.map((p) => p.id);

  let deletedProducts = 0;
  if (seedProductIds.length > 0) {
    const seedAds = await query<{ id: number }>(
      `SELECT id FROM ads WHERE product_id = ANY($1)`,
      [seedProductIds]
    );
    const seedAdIds = seedAds.map((a) => a.id);

    if (seedAdIds.length > 0) {
      await query(`DELETE FROM ad_metrics WHERE ad_id = ANY($1)`, [seedAdIds]);
      await query(`DELETE FROM ads WHERE id = ANY($1)`, [seedAdIds]);
    }
    await query(`DELETE FROM skus WHERE product_id = ANY($1)`, [seedProductIds]);
    await query(`UPDATE operational_errors SET product_id = NULL WHERE product_id = ANY($1)`, [seedProductIds]);
    await query(`DELETE FROM complaints WHERE product_id = ANY($1)`, [seedProductIds]);
    await query(`DELETE FROM delays WHERE product_id = ANY($1)`, [seedProductIds]);
    await query(`DELETE FROM returns WHERE product_id = ANY($1)`, [seedProductIds]);
    await query(`DELETE FROM shipments WHERE product_id = ANY($1)`, [seedProductIds]);

    await query(`DELETE FROM products WHERE id = ANY($1)`, [seedProductIds]);
    deletedProducts = seedProductIds.length;
  }

  await query(`DELETE FROM team_activities WHERE employee_id IN (SELECT id FROM employees WHERE company_id = $1)`, [companyId]);
  await query(`DELETE FROM employees WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM operational_errors WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM complaints WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM delays WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM returns WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM shipments WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM sales_metrics WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM kpi_snapshots WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM alerts WHERE company_id = $1`, [companyId]);
  await query(`DELETE FROM ai_reports WHERE company_id = $1`, [companyId]);

  return NextResponse.json({
    ok: true,
    deletedProducts,
    summary: `${deletedProducts} produto(s) de teste removidos. Funcionários, erros operacionais, reclamações, atrasos, devoluções, métricas de vendas e alertas fictícios foram zerados.`,
  });
}
