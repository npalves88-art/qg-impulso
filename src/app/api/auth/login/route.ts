import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const users = await query<{
    id: number;
    company_id: number;
    name: string;
    email: string;
    password_hash: string;
    avatar_color: string;
    role_name: string;
  }>(
    `SELECT u.*, r.name as role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );
  const user = users[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  await createSession({
    userId: user.id,
    companyId: user.company_id,
    name: user.name,
    email: user.email,
    role: user.role_name,
    avatarColor: user.avatar_color,
  });

  return NextResponse.json({ ok: true });
}
