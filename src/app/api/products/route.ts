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
