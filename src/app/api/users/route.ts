import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "Administrador") {
    return NextResponse.json({ error: "Apenas administradores podem criar usuários." }, { status: 403 });
  }

  const { name, email, password, role, employeeId } = await req.json();
  if (!email || !password || !role || (!employeeId && !name)) {
    return NextResponse.json({ error: "Preencha nome, e-mail, senha e perfil." }, { status: 400 });
  }

  const roleRow = (await query<{ id: number }>(`SELECT id FROM roles WHERE name = $1`, [role]))[0];
  if (!roleRow) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const existing = await query<{ id: number }>(`SELECT id FROM employees WHERE email = $1`, [email]);
  if (existing.length > 0 && existing[0].id !== employeeId) {
    return NextResponse.json({ error: "Já existe um cadastro com esse e-mail." }, { status: 400 });
  }

  const colors = ["#FF6B00", "#123C4A", "#2E7D32", "#7B1FA2", "#C2185B", "#0277BD"];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const passwordHash = bcrypt.hashSync(password, 10);

  if (employeeId) {
    await query(
      `UPDATE employees SET email = $1, password_hash = $2, role_id = $3 WHERE id = $4 AND company_id = $5`,
      [email, passwordHash, roleRow.id, employeeId, session.companyId]
    );
  } else {
    await query(
      `INSERT INTO employees (company_id, name, email, password_hash, role_id, avatar_color, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ativo')`,
      [session.companyId, name, email, passwordHash, roleRow.id, avatarColor]
    );
  }

  return NextResponse.json({ ok: true });
}
