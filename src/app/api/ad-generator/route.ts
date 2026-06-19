import { NextRequest, NextResponse } from "next/server";

function buildTitle(product: string, marketplace: string, keywords: string[]) {
  const kw = keywords.slice(0, 3).join(" ");
  if (marketplace === "mercado-livre") {
    return `${product} ${kw} Original Premium Envio Rápido`.replace(/\s+/g, " ").trim().slice(0, 60);
  }
  return `${product} ${kw} Promoção Frete Grátis`.replace(/\s+/g, " ").trim().slice(0, 60);
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

function buildDescription(product: string, audience: string, differentials: string[]) {
  const diffText = differentials.length
    ? `Destaques: ${differentials.join(", ")}.`
    : "";
  return `${product} desenvolvido para atender ${audience || "quem busca praticidade e qualidade no dia a dia"}. ${diffText}

Principais benefícios:
- Alta durabilidade e excelente acabamento
- Fácil de usar e instalar
- Atende às necessidades de uso doméstico e profissional

Compre com confiança: enviamos com agilidade e oferecemos suporte completo antes e depois da compra. Garanta já o seu e aproveite as condições especiais.`;
}

function buildFaq(product: string) {
  return [
    { q: `O ${product} tem garantia?`, a: "Sim, o produto possui garantia conforme especificado no anúncio e segue as políticas do marketplace." },
    { q: "Qual o prazo de envio?", a: "O envio é realizado em até 24h após a confirmação do pagamento, em dias úteis." },
    { q: "O produto é original?", a: "Sim, trabalhamos apenas com produtos originais e de procedência garantida." },
    { q: "Posso trocar se não atender minhas expectativas?", a: "Sim, seguimos a política de troca e devolução do marketplace." },
  ];
}

function buildKeywords(product: string, category: string) {
  const words = `${product} ${category}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const variants = [...new Set(words)];
  const suffixes = ["original", "promoção", "barato", "premium", "envio rápido", "frete grátis"];
  return [...variants, ...suffixes.map((s) => `${words[0] || product} ${s}`)].slice(0, 12);
}

function buildSeoTips(marketplace: string, healthHints: string[]) {
  const tips = [
    "Use as primeiras palavras do título para o termo de busca mais relevante.",
    "Inclua medidas, cor e material no título quando aplicável.",
    "Utilize todas as imagens disponíveis, priorizando fotos em fundo branco e de uso real.",
    "Responda perguntas dos compradores em até 1 hora para melhorar a reputação do anúncio.",
    marketplace === "mercado-livre"
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
    marketplace = "mercado-livre",
    audience = "",
    differentials = [],
    currentTitle = "",
  } = body;

  const diffList: string[] = Array.isArray(differentials)
    ? differentials
    : String(differentials || "")
        .split(",")
        .map((d: string) => d.trim())
        .filter(Boolean);

  const keywords = buildKeywords(product, category);
  const title = buildTitle(product, marketplace, keywords);
  const bullets = buildBullets(product, diffList);
  const description = buildDescription(product, audience, diffList);
  const faq = buildFaq(product);

  const healthHints: string[] = [];
  if (currentTitle && currentTitle.length < 40) {
    healthHints.push("Seu título atual é curto — aproveite o limite de caracteres para incluir mais termos de busca.");
  }
  if (currentTitle && !/[0-9]/.test(currentTitle)) {
    healthHints.push("Considere incluir medidas, quantidade ou voltagem no título para reduzir dúvidas do comprador.");
  }
  const seoTips = buildSeoTips(marketplace, healthHints);

  return NextResponse.json({
    title,
    bullets,
    description,
    faq,
    keywords,
    seoTips,
  });
}
