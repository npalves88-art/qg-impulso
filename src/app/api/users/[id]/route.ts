import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem editar usuários." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const { name, role } = await req.json();

  const target = (await query<{ id: number }>(`SELECT id FROM employees WHERE id = $1 AND company_id = $2`, [
    userId,
    session.companyId,
  ]))[0];
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (name) {
    await query(`UPDATE employees SET name = $1 WHERE id = $2`, [name, userId]);
  }
  if (role) {
    const roleRow = (await query<{ id: number }>(`SELECT id FROM roles WHERE name = $1`, [role]))[0];
    if (!roleRow) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    await query(`UPDATE employees SET role_id = $1 WHERE id = $2`, [roleRow.id, userId]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem excluir usuários." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (userId === session.userId) {
    return NextResponse.json({ error: "Você não pode excluir o próprio usuário." }, { status: 400 });
  }

  const target = (await query<{ id: number }>(`SELECT id FROM employees WHERE id = $1 AND company_id = $2`, [
    userId,
    session.companyId,
  ]))[0];
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await query(`DELETE FROM team_activities WHERE employee_id = $1`, [userId]);
  await query(`UPDATE operational_errors SET employee_id = NULL WHERE employee_id = $1`, [userId]);
  await query(`DELETE FROM employees WHERE id = $1`, [userId]);

  return NextResponse.json({ ok: true });
}
