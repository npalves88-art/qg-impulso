import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { product_id, employee_id, type, description, estimated_cost, sla_hours } = await req.json();
  if (!type) {
    return NextResponse.json({ error: "Selecione o tipo de ocorrência." }, { status: 400 });
  }

  await query(
    `INSERT INTO operational_errors (company_id, product_id, employee_id, type, description, estimated_cost, sla_hours, status, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'aberto', $8)`,
    [
      session.companyId,
      product_id || null,
      employee_id || null,
      type,
      description || null,
      Number(estimated_cost) || 0,
      Number(sla_hours) || 48,
      new Date().toISOString().slice(0, 10),
    ]
  );

  return NextResponse.json({ ok: true });
}
