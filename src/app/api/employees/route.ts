import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { name, role, area, email } = await req.json();
  if (!name || !role || !area) {
    return NextResponse.json({ error: "Preencha nome, função e área." }, { status: 400 });
  }

  await query(
    `INSERT INTO employees (company_id, name, role, area, email, admission_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'ativo')`,
    [session.companyId, name, role, area, email || null, new Date().toISOString().slice(0, 10)]
  );

  return NextResponse.json({ ok: true });
}
