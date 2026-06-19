import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { name, cnpj, segment } = await req.json();
  await query(`UPDATE companies SET name = $1, cnpj = $2, segment = $3 WHERE id = $4`, [
    name,
    cnpj,
    segment,
    session.companyId,
  ]);

  return NextResponse.json({ ok: true });
}
