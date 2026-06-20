import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { name, category, cost_price, sale_price, stock } = await req.json();
  if (!name || !category) {
    return NextResponse.json({ error: "Preencha nome e categoria." }, { status: 400 });
  }

  await query(
    `INSERT INTO products (company_id, name, category, cost_price, sale_price, stock, curve, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'B', 'ativo')`,
    [session.companyId, name, category, Number(cost_price) || 0, Number(sale_price) || 0, Number(stock) || 0]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Informe os produtos a excluir." }, { status: 400 });
  }

  const owned = await query<{ id: number }>(
    `SELECT id FROM products WHERE company_id = $1 AND id = ANY($2::int[])`,
    [session.companyId, ids]
  );
  const ownedIds = owned.map((r) => r.id);
  if (ownedIds.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  await query(`DELETE FROM ad_metrics WHERE ad_id IN (SELECT id FROM ads WHERE product_id = ANY($1::int[]))`, [ownedIds]);
  await query(`DELETE FROM ads WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`DELETE FROM skus WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`UPDATE operational_errors SET product_id = NULL WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`UPDATE complaints SET product_id = NULL WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`UPDATE delays SET product_id = NULL WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`UPDATE returns SET product_id = NULL WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`UPDATE shipments SET product_id = NULL WHERE product_id = ANY($1::int[])`, [ownedIds]);
  await query(`DELETE FROM products WHERE id = ANY($1::int[])`, [ownedIds]);

  return NextResponse.json({ deleted: ownedIds.length });
}
