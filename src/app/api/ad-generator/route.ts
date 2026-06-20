import { NextRequest, NextResponse } from "next/server";

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildTitle(product: string, marketplace: "ml" | "shopee", keywords: string[], maxLen: number) {
  const kw = keywords.slice(0, 3).join(" ");
  const suffix = marketplace === "ml" ? "Original Premium Envio Rápido" : "Promoção Frete Grátis Original";
  return clean(`${product} ${kw} ${suffix}`).slice(0, maxLen);
}

function buildBullets(product: string, differentials: string[]) {
  const base = [
    `✔ ${product} com qualidade testada e aprovada por milhares de clientes`,
    `✔ Material resistente e durável, ideal para uso diário`,
    `✔ Envio rápido e embalagem segura para proteger seu produto`,
    `✔ Excelente custo-benefício comparado a marcas concorrentes`,
  ];
  const extra = differentials.filter(Boolean).map((d) => `✔ ${d}`);
  return [...extra, ...base].slice(0, 6);
}

function buildShortDescription(product: string, audience: string) {
  return clean(
    `${product}: a escolha certa para ${audience || "quem busca praticidade e qualidade no dia a dia"}. Confira agora.`
  );
}

function buildLongDescription(
  product: string,
  audience: string,
  differentials: string[],
  material: string,
  doubts: string
) {
  const diffText = differentials.length ? `Destaques: ${differentials.join(", ")}.` : "";
  const materialText = material ? `Fabricado em ${material}, garantindo durabilidade.` : "";
  const doubtsText = doubts ? `\n\nDúvidas comuns: ${doubts}` : "";
  return `${product} desenvolvido para atender ${audience || "quem busca praticidade e qualidade no dia a dia"}. ${diffText} ${materialText}

Principais benefícios:
- Alta durabilidade e excelente acabamento
- Fácil de usar e instalar
- Atende às necessidades de uso doméstico e profissional

Compre com confiança: enviamos com agilidade e oferecemos suporte completo antes e depois da compra. Garanta já o seu e aproveite as condições especiais.${doubtsText}`;
}

function buildEffects(differentials: string[]) {
  if (differentials.length) {
    return differentials.map((d) => `- ${d}`).join("\n");
  }
  return "- Melhora a praticidade do dia a dia\n- Alta durabilidade\n- Excelente relação custo-benefício";
}

function buildUsage(category: string) {
  return `Retire o produto da embalagem, verifique todos os itens inclusos e siga as instruções específicas para ${category || "o tipo de produto"}. Em caso de dúvidas, consulte o manual ou entre em contato com o vendedor.`;
}

function buildFaq(product: string, doubts: string) {
  const base = [
    { q: `O ${product} tem garantia?`, a: "Sim, o produto possui garantia conforme especificado no anúncio e segue as políticas do marketplace." },
    { q: "Qual o prazo de envio?", a: "O envio é realizado em até 24h após a confirmação do pagamento, em dias úteis." },
    { q: "O produto é original?", a: "Sim, trabalhamos apenas com produtos originais e de procedência garantida." },
    { q: "Posso trocar se não atender minhas expectativas?", a: "Sim, seguimos a política de troca e devolução do marketplace." },
  ];
  if (doubts) {
    base.unshift({ q: doubts, a: "Resposta detalhada disponível na descrição do anúncio e via chat com o vendedor." });
  }
  return base;
}

function buildKeywords(product: string, category: string, mainKeywords: string, similarNames: string, referenceWords: string) {
  const sourceText = `${product} ${category} ${mainKeywords} ${similarNames} ${referenceWords}`;
  const words = sourceText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[\s,]+/)
    .filter(Boolean);
  const variants = [...new Set(words)];
  const suffixes = ["original", "promoção", "barato", "premium", "envio rápido", "frete grátis"];
  return [...variants, ...suffixes.map((s) => `${words[0] || product} ${s}`)].slice(0, 16);
}

function buildSeoTips(marketplace: "ml" | "shopee", healthHints: string[]) {
  const tips = [
    "Use as primeiras palavras do título para o termo de busca mais relevante.",
    "Inclua medidas, cor e material no título quando aplicável.",
    "Utilize todas as imagens disponíveis, priorizando fotos em fundo branco e de uso real.",
    "Responda perguntas dos compradores em até 1 hora para melhorar a reputação do anúncio.",
    marketplace === "ml"
      ? "Ative o Mercado Envios Full para ganhar prioridade no algoritmo de busca."
      : "Participe de campanhas e cupons da Shopee para aumentar a visibilidade do anúncio.",
  ];
  return [...tips, ...healthHints];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    product = "Produto",
    category = "Geral",
    marketplace = "ambos",
    audience = "",
    differentials = [],
    currentTitleMl = "",
    currentTitleShopee = "",
    material = "",
    mainKeywords = "",
    similarNames = "",
    referenceWords = "",
    customerDoubts = "",
  } = body;

  const diffList: string[] = Array.isArray(differentials)
    ? differentials
    : String(differentials || "")
        .split(",")
        .map((d: string) => d.trim())
        .filter(Boolean);

  const keywords = buildKeywords(product, category, mainKeywords, similarNames, referenceWords);
  const titleMl = buildTitle(product, "ml", keywords, 60);
  const titleShopee = buildTitle(product, "shopee", keywords, 120);
  const bullets = buildBullets(product, diffList);
  const shortDescription = buildShortDescription(product, audience);
  const longDescription = buildLongDescription(product, audience, diffList, material, customerDoubts);
  const effects = buildEffects(diffList);
  const usage = buildUsage(category);
  const faq = buildFaq(product, customerDoubts);

  const healthHints: string[] = [];
  if (currentTitleMl && currentTitleMl.length < 40) {
    healthHints.push("Seu título atual do Mercado Livre é curto — aproveite os 60 caracteres para incluir mais termos de busca.");
  }
  if (currentTitleShopee && currentTitleShopee.length < 60) {
    healthHints.push("Seu título atual da Shopee é curto — aproveite os 120 caracteres para incluir mais termos de busca.");
  }
  if ((currentTitleMl && !/[0-9]/.test(currentTitleMl)) || (currentTitleShopee && !/[0-9]/.test(currentTitleShopee))) {
    healthHints.push("Considere incluir medidas, quantidade ou voltagem no título para reduzir dúvidas do comprador.");
  }
  const seoTips = buildSeoTips(marketplace === "shopee" ? "shopee" : "ml", healthHints);

  return NextResponse.json({
    titleMl,
    titleShopee,
    bullets,
    shortDescription,
    longDescription,
    effects,
    usage,
    faq,
    keywords,
    seoTips,
  });
}
