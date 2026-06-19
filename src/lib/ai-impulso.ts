import {
  getExecutiveDashboard,
  getOperationalRadar,
  getBusinessRadar,
  getTeamRadar,
  getMarketplacePerformance,
} from "./queries";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function matches(question: string, terms: string[]) {
  const q = question.toLowerCase();
  return terms.some((t) => q.includes(t));
}

export async function answerQuestion(companyId: number, question: string): Promise<string> {
  const q = question.trim();

  if (matches(q, ["corrigir hoje", "o que preciso corrigir", "o que fazer agora", "prioridade hoje"])) {
    const ops = await getOperationalRadar(companyId);
    const exec = await getExecutiveDashboard(companyId);
    const lines: string[] = [];
    if (ops.openErrors > 0) lines.push(`- Resolver ${ops.openErrors} erro(s) operacional(is) em aberto.`);
    if (ops.openComplaints > 0) lines.push(`- Responder ${ops.openComplaints} reclamação(ões) em aberto antes que impactem a reputação.`);
    if (exec.errorRate7 > 2) lines.push(`- Taxa de erro operacional está em ${exec.errorRate7.toFixed(2)}%, acima da meta de 2%.`);
    if (exec.criticalProducts.length > 0) {
      lines.push(`- Repor estoque de: ${exec.criticalProducts.map((p: any) => p.name).join(", ")}.`);
    }
    if (lines.length === 0) lines.push("- Nenhuma pendência crítica identificada hoje. Operação dentro da meta.");
    return `Prioridades de hoje:\n${lines.join("\n")}`;
  }

  if (matches(q, ["anúncio está com problema", "anuncio esta com problema", "anúncio com problema", "qual anúncio"])) {
    const mps = await getMarketplacePerformance(companyId);
    const worst = mps.flatMap((mp: any) => mp.worstAds.map((a: any) => ({ ...a, marketplace: mp.name })))
      .sort((a: any, b: any) => a.health_score - b.health_score)[0];
    if (!worst) return "Não encontrei anúncios com problemas críticos no momento.";
    return `O anúncio com maior risco é "${worst.title}" (${worst.marketplace}), com score de saúde ${worst.health_score}/100. Recomendo revisar título, imagens e preço, e verificar concorrência direta.`;
  }

  if (matches(q, ["qual produto devo priorizar", "produto priorizar", "o que priorizar"])) {
    const biz = await getBusinessRadar(companyId);
    const champion = biz.champions[0];
    if (!champion) return "Ainda não há dados suficientes para indicar um produto prioritário.";
    return `Priorize "${champion.name}" — gerou ${BRL(champion.revenue7)} em faturamento e ${champion.orders7} pedidos nos últimos 7 dias, com margem de ${champion.margin}%. Vale aumentar investimento em anúncio e garantir estoque.`;
  }

  if (matches(q, ["por que minha conversão caiu", "conversao caiu", "conversão caiu", "por que a conversao"])) {
    const exec = await getExecutiveDashboard(companyId);
    return `Sua conversão geral está em ${exec.conversion7.toFixed(2)}%. Possíveis causas: queda no CTR (atual: ${exec.ctr7.toFixed(2)}%), aumento de reclamações (${exec.openComplaints} em aberto) ou produtos com estoque crítico (${exec.criticalProducts.length} identificados). Revise preço, fotos e tempo de resposta a perguntas.`;
  }

  if (matches(q, ["quem da equipe está produzindo menos", "quem esta produzindo menos", "produzindo menos", "menor produtividade"])) {
    const team = await getTeamRadar(companyId);
    const lowest = team.employees[team.employees.length - 1];
    if (!lowest) return "Não há colaboradores cadastrados ainda.";
    return `${lowest.name} (${lowest.area}) está com o menor score de produtividade (${lowest.score.toFixed(1)}) nos últimos 7 dias. Vale uma conversa 1:1 para entender se há bloqueios operacionais ou de carga de trabalho.`;
  }

  if (matches(q, ["sku", "envio errado", "skus tiveram envio errado", "produtos errados"])) {
    const ops = await getOperationalRadar(companyId);
    const wrongProduct = ops.errors.filter((e: any) => e.type === "Produto Errado");
    if (wrongProduct.length === 0) return "Não há registros recentes de SKUs com envio errado.";
    const names = [...new Set(wrongProduct.map((e: any) => e.product_name))].slice(0, 5);
    return `Identifiquei ${wrongProduct.length} ocorrência(s) de produto errado, envolvendo: ${names.join(", ")}. Recomendo reforçar a conferência na separação desses SKUs.`;
  }

  if (matches(q, ["onde estou perdendo dinheiro", "perdendo dinheiro", "onde perco dinheiro"])) {
    const ops = await getOperationalRadar(companyId);
    const biz = await getBusinessRadar(companyId);
    const stalledRevenueLoss = biz.stalled.length;
    return `Principais fontes de perda: custo estimado de falhas operacionais de ${BRL(ops.totalCost)} (erros + devoluções), e ${stalledRevenueLoss} produto(s) parado(s) sem giro, gerando capital empatado em estoque.`;
  }

  if (matches(q, ["faturamento", "vendas", "receita"])) {
    const exec = await getExecutiveDashboard(companyId);
    return `Faturamento dos últimos 7 dias: ${BRL(exec.revenue7)}, com ${exec.orders7} pedidos e ticket médio de ${BRL(exec.avgTicket7)}.`;
  }

  const exec = await getExecutiveDashboard(companyId);
  return `Resumo rápido da operação: faturamento de ${BRL(exec.revenue7)} nos últimos 7 dias, conversão de ${exec.conversion7.toFixed(2)}%, ${exec.openErrors} erro(s) operacional(is) e ${exec.openComplaints} reclamação(ões) em aberto. Pergunte algo mais específico, como "o que preciso corrigir hoje?" ou "qual produto devo priorizar?".`;
}
