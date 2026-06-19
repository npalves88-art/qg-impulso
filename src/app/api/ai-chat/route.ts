import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { answerQuestion } from "@/lib/ai-impulso";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: "Pergunta vazia." }, { status: 400 });

  const answer = await answerQuestion(session.companyId, question);

  await query(`INSERT INTO ai_reports (company_id, question, answer) VALUES ($1, $2, $3)`, [
    session.companyId,
    question,
    answer,
  ]);

  return NextResponse.json({ answer });
}
