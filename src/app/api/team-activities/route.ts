import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { skus_worked, ads_created, images_made, orders_picked, orders_shipped, self_score } = await req.json();

  const skus = Number(skus_worked) || 0;
  const ads = Number(ads_created) || 0;
  const images = Number(images_made) || 0;
  const picked = Number(orders_picked) || 0;
  const shipped = Number(orders_shipped) || 0;
  const score = self_score !== undefined && self_score !== null && self_score !== ""
    ? Number(self_score)
    : +(skus * 1.5 + ads * 3 + images * 1.2 + picked * 0.5 + shipped * 0.6).toFixed(1);

  const today = new Date().toISOString().slice(0, 10);

  const existing = await query<{ id: number }>(
    `SELECT id FROM team_activities WHERE employee_id = $1 AND date = $2`,
    [session.userId, today]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE team_activities
       SET skus_worked = $1, ads_created = $2, images_made = $3, orders_picked = $4, orders_shipped = $5, score = $6
       WHERE id = $7`,
      [skus, ads, images, picked, shipped, score, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO team_activities (employee_id, date, skus_worked, ads_created, images_made, orders_picked, orders_shipped, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [session.userId, today, skus, ads, images, picked, shipped, score]
    );
  }

  return NextResponse.json({ ok: true });
}
