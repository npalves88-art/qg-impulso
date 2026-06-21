"use client";

import { useState } from "react";

const ACTIVITY_LABELS: Record<string, string> = {
  cadastro_produto: "Cadastro Produto",
  criacao_anuncio: "Criação Anúncio",
  revisao_anuncio: "Revisão Anúncio",
  seo: "SEO",
  criacao_imagens: "Criação Imagens",
  edicao_imagens: "Edição Imagens",
  video: "Vídeo",
  pesquisa_concorrencia: "Pesquisa Concorrência",
  correcao: "Correção",
  atualizacao: "Atualização",
  outro: "Outro",
};

function scoreLabel(score: number | null) {
  if (score === null) return "";
  if (score >= 9) return "Excelente";
  if (score >= 7) return "Ótimo";
  if (score >= 5) return "Regular";
  return "Abaixo do esperado";
}

function countActivity(skus: any[], key: string) {
  return skus.filter((s) => (s.activities || []).includes(key)).length;
}

function buildReportText(report: any) {
  const dateFormatted = new Date(report.date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const lines: string[] = [];
  lines.push("📊 RADAR DE PRODUTIVIDADE — IMPULSO");
  lines.push("══════════════════════════════════════════════════");
  lines.push(`📅 Data: ${dateFormatted}`);
  lines.push(`👤 Colaborador: ${report.employeeName}`);
  if (report.cliente) lines.push(`🏢 Cliente: ${report.cliente}`);
  lines.push("");
  lines.push("📦 RESUMO DE PRODUÇÃO");
  lines.push(`  • SKUs trabalhados: ${report.skus.length}`);
  lines.push(`  • Cadastros: ${countActivity(report.skus, "cadastro_produto")}`);
  lines.push(`  • Anúncios criados: ${countActivity(report.skus, "criacao_anuncio")}`);
  lines.push(`  • Anúncios revisados: ${countActivity(report.skus, "revisao_anuncio")}`);
  lines.push(`  • SEO realizados: ${countActivity(report.skus, "seo")}`);
  lines.push(`  • Imagens criadas: ${countActivity(report.skus, "criacao_imagens")}`);
  lines.push(`  • Imagens editadas: ${countActivity(report.skus, "edicao_imagens")}`);
  lines.push(`  • Vídeos: ${countActivity(report.skus, "video")}`);
  lines.push("");

  if (report.skus.length > 0) {
    lines.push("⬛ SKUs TRABALHADOS");
    for (const s of report.skus) {
      lines.push(`  SKU: ${s.sku_code || "-"} — ${s.product_name || "-"}`);
      lines.push(`  Atividades: ${(s.activities || []).map((a: string) => ACTIVITY_LABELS[a] || a).join(", ") || "-"}`);
    }
    lines.push("");
  }

  if (report.pendencias.length > 0) {
    lines.push("⚠️ PENDÊNCIAS");
    for (const p of report.pendencias) {
      lines.push(`  SKU: ${p.sku_code || "-"} — ${p.motivo || "-"}`);
    }
    lines.push("");
  }

  if (report.gargalos.length > 0) {
    lines.push("🚧 GARGALOS IDENTIFICADOS");
    lines.push(`  ${report.gargalos.join(", ")}`);
    if (report.gargalosDetalhamento) lines.push(`  Detalhamento: ${report.gargalosDetalhamento}`);
    lines.push("");
  }

  if (report.planejamento.length > 0) {
    lines.push("🎯 PLANEJAMENTO PRÓXIMO DIA");
    for (const item of report.planejamento) {
      lines.push(`  • ${item.sku_code || "-"} — ${item.produto || "-"} [${ACTIVITY_LABELS[item.atividade] || item.atividade || "-"}]`);
    }
    lines.push("");
  }

  lines.push(`⭐ Autoavaliação: ${report.selfScore ?? "-"}/10 — ${scoreLabel(report.selfScore)}`);
  lines.push("");
  lines.push(`✦ Análise: ${report.analysis}`);
  lines.push("");
  lines.push("⚡ SKU trabalhado gera resultado.");

  return lines.join("\n");
}

export default function RelatorioView({ report }: { report: any | null }) {
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <div className="card p-10 text-center">
        <p className="text-[#F5F3EF]/50">Nenhum relatório gerado ainda</p>
        <p className="text-xs text-[#F5F3EF]/30 mt-1">Preencha o formulário em "Registro do Dia" e clique em "Gerar Relatório do Dia"</p>
      </div>
    );
  }

  const text = buildReportText(report);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Radar de Produtividade — ${report.employeeName}</title></head>
        <body style="font-family: monospace; white-space: pre-wrap; padding: 24px; font-size: 13px; color: #111;">
${text.replace(/</g, "&lt;")}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition"
        >
          {copied ? "✓ Copiado!" : "Copiar Texto"}
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition"
        >
          Baixar PDF / Imprimir
        </button>
      </div>
      <div className="card p-6">
        <pre className="whitespace-pre-wrap text-sm font-mono text-[#F5F3EF]/85 leading-relaxed">{text}</pre>
      </div>
    </div>
  );
}
