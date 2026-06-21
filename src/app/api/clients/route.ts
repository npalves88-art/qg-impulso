import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem cadastrar clientes." }, { status: 403 });
  }

  const { razao_social, responsavel, platforms, employee_ids } = await req.json();
  if (!razao_social) {
    return NextResponse.json({ error: "Informe a razão social." }, { status: 400 });
  }

  const inserted = await query<{ id: number }>(
    `INSERT INTO clients (company_id, razao_social, responsavel, platforms, status)
     VALUES ($1, $2, $3, $4, 'ativo') RETURNING id`,
    [session.companyId, razao_social, responsavel || null, Array.isArray(platforms) ? platforms : []]
  );
  const clientId = inserted[0].id;

  for (const empId of Array.isArray(employee_ids) ? employee_ids : []) {
    await query(`INSERT INTO employee_clients (employee_id, client_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      Number(empId),
      clientId,
    ]);
  }

  return NextResponse.json({ ok: true });
}
