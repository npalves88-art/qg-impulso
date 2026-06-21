const ACTIVITY_LABELS: Record<string, string> = {
  cadastro_produto: "cadastro de produto",
  criacao_anuncio: "criação de anúncios",
  revisao_anuncio: "revisão de anúncios",
  seo: "otimização SEO",
  criacao_imagens: "criação de imagens",
  edicao_imagens: "edição de imagens",
  video: "produção de vídeo",
  pesquisa_concorrencia: "pesquisa de concorrência",
  correcao: "correções",
  atualizacao: "atualizações",
  outro: "outras atividades",
};

type SkuEntry = { activities: string[] };

function scoreLabel(score: number | null) {
  if (score === null) return "";
  if (score >= 9) return "excelente";
  if (score >= 7) return "ótimo";
  if (score >= 5) return "regular";
  return "abaixo do esperado";
}

export function generateDailyReportAnalysis(params: {
  employeeName: string;
  date: string;
  cliente?: string | null;
  skus: SkuEntry[];
  gargalos: string[];
  gargalosDetalhamento?: string | null;
  pendenciasCount: number;
  selfScore: number | null;
}) {
  const { employeeName, date, cliente, skus, gargalos, gargalosDetalhamento, pendenciasCount, selfScore } = params;

  const dateFormatted = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const activityCounts: Record<string, number> = {};
  for (const sku of skus) {
    for (const a of sku.activities || []) {
      activityCounts[a] = (activityCounts[a] || 0) + 1;
    }
  }
  const sortedActivities = Object.entries(activityCounts).sort((a, b) => b[1] - a[1]);
  const focusLabels = sortedActivities.slice(0, 2).map(([key]) => ACTIVITY_LABELS[key] || key);

  const clienteText = cliente ? ` na conta da ${cliente}` : "";
  const focusText =
    focusLabels.length === 0
      ? "sem atividades específicas registradas"
      : focusLabels.length === 1
      ? `com foco em ${focusLabels[0]}`
      : `com foco em ${focusLabels.join(" e ")}`;

  const skuCountText = skus.length === 1 ? "1 SKU trabalhado" : `${skus.length} SKUs trabalhados`;

  const issuesText =
    gargalos.length > 0 || pendenciasCount > 0
      ? `Foram identificados ${gargalos.length} gargalo(s)${gargalos.length > 0 ? ` (${gargalos.join(", ")})` : ""}${
          gargalosDetalhamento ? `: ${gargalosDetalhamento}` : ""
        }${pendenciasCount > 0 ? ` e ${pendenciasCount} pendência(s) em aberto` : ""}.`
      : "Todas as entregas foram concluídas sem pendências ou gargalos identificados.";

  const scoreText =
    selfScore !== null
      ? `A autoavaliação da colaboradora foi de ${selfScore}/10, refletindo um dia ${scoreLabel(selfScore)}${
          selfScore >= 7 ? " e alinhado às demandas" : ""
        }${cliente ? ` do cliente` : ""}.`
      : "";

  return `No dia ${dateFormatted}, ${employeeName} atuou${clienteText} ${focusText}, contemplando ${skuCountText}. ${issuesText} ${scoreText}`.trim();
}
