import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { name, cnpj, segment, logo_url } = await req.json();

  if (logo_url !== undefined) {
    // Base64 data URLs from the logo upload can be a few hundred KB; keep a sane cap.
    if (typeof logo_url === "string" && logo_url.length > 2_000_000) {
      return NextResponse.json({ error: "Imagem muito grande. Escolha um arquivo menor." }, { status: 400 });
    }
    await query(`UPDATE companies SET logo_url = $1 WHERE id = $2`, [logo_url || null, session.companyId]);
  }

  if (name !== undefined) {
    await query(`UPDATE companies SET name = $1, cnpj = $2, segment = $3 WHERE id = $4`, [
      name,
      cnpj,
      segment,
      session.companyId,
    ]);
  }

  return NextResponse.json({ ok: true });
}
