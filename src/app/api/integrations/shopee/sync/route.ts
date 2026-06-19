import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncShopee } from "@/lib/integrations/shopee";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const result = await syncShopee(session.companyId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
