import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem editar clientes." }, { status: 403 });
  }

  const { id } = await params;
  const clientId = Number(id);
  const target = (await query<{ id: number }>(`SELECT id FROM clients WHERE id = $1 AND company_id = $2`, [
    clientId,
    session.companyId,
  ]))[0];
  if (!target) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const { razao_social, responsavel, platforms, status, employee_ids } = await req.json();

  if (razao_social !== undefined) await query(`UPDATE clients SET razao_social = $1 WHERE id = $2`, [razao_social, clientId]);
  if (responsavel !== undefined) await query(`UPDATE clients SET responsavel = $1 WHERE id = $2`, [responsavel, clientId]);
  if (Array.isArray(platforms)) await query(`UPDATE clients SET platforms = $1 WHERE id = $2`, [platforms, clientId]);
  if (status !== undefined) await query(`UPDATE clients SET status = $1 WHERE id = $2`, [status, clientId]);

  if (Array.isArray(employee_ids)) {
    await query(`DELETE FROM employee_clients WHERE client_id = $1`, [clientId]);
    for (const empId of employee_ids) {
      await query(`INSERT INTO employee_clients (employee_id, client_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
        Number(empId),
        clientId,
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem excluir clientes." }, { status: 403 });
  }

  const { id } = await params;
  const clientId = Number(id);
  const target = (await query<{ id: number }>(`SELECT id FROM clients WHERE id = $1 AND company_id = $2`, [
    clientId,
    session.companyId,
  ]))[0];
  if (!target) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  await query(`UPDATE daily_reports SET client_id = NULL WHERE client_id = $1`, [clientId]);
  await query(`DELETE FROM employee_clients WHERE client_id = $1`, [clientId]);
  await query(`DELETE FROM clients WHERE id = $1`, [clientId]);

  return NextResponse.json({ ok: true });
}
