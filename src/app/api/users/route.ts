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

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Preencha nome, e-mail, senha e perfil." }, { status: 400 });
  }

  const roleRow = (await query<{ id: number }>(`SELECT id FROM roles WHERE name = $1`, [role]))[0];
  if (!roleRow) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 400 });
  }

  const colors = ["#FF6B00", "#123C4A", "#2E7D32", "#7B1FA2", "#C2185B", "#0277BD"];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const passwordHash = bcrypt.hashSync(password, 10);

  await query(
    `INSERT INTO users (company_id, role_id, name, email, password_hash, avatar_color) VALUES ($1, $2, $3, $4, $5, $6)`,
    [session.companyId, roleRow.id, name, email, passwordHash, avatarColor]
  );

  return NextResponse.json({ ok: true });
}
