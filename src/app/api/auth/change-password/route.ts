import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Preencha a senha atual e a nova senha." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "A nova senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const user = (await query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [
    session.userId,
  ]))[0];
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, session.userId]);

  return NextResponse.json({ ok: true });
}
