"use client";

import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";

type Result = {
  title: string;
  bullets: string[];
  description: string;
  faq: { q: string; a: string }[];
  keywords: string[];
  seoTips: string[];
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs text-[#F5F3EF]/50 hover:text-[#FF6B00] transition"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function AdGeneratorForm() {
  const [form, setForm] = useState({
    product: "",
    category: "",
    marketplace: "mercado-livre",
    audience: "",
    differentials: "",
    currentTitle: "",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ad-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleGenerate} className="card p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Marketplace</label>
          <div className="flex gap-2">
            {[
              { v: "mercado-livre", l: "Mercado Livre" },
              { v: "shopee", l: "Shopee" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm({ ...form, marketplace: opt.v })}
                className={`px-4 py-2 rounded-xl text-sm transition ${
                  form.marketplace === opt.v
                    ? "bg-[#FF6B00] text-[#0F0F10] font-medium"
                    : "bg-white/5 text-[#F5F3EF]/70 hover:bg-white/10"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Nome do Produto *</label>
          <input
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            placeholder="Ex: Fone de Ouvido Bluetooth TWS"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Categoria</label>
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            placeholder="Ex: Eletrônicos"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Público-alvo</label>
          <input
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            placeholder="Ex: pessoas ativas que praticam esportes"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Diferenciais (separados por vírgula)</label>
          <input
            value={form.differentials}
            onChange={(e) => setForm({ ...form, differentials: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            placeholder="Ex: bateria 30h, resistente à água, cancelamento de ruído"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Título Atual (opcional, para diagnóstico)</label>
          <input
            value={form.currentTitle}
            onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            placeholder="Cole o título atual do anúncio"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-semibold hover:bg-[#ff7d1f] transition disabled:opacity-60"
        >
          <Sparkles size={18} />
          {loading ? "Gerando..." : "Gerar Anúncio com IA"}
        </button>
      </form>

      <div className="space-y-4">
        {!result && (
          <div className="card p-6 h-full flex flex-col items-center justify-center text-center text-[#F5F3EF]/40 min-h-[300px]">
            <Sparkles size={28} className="mb-3 text-[#FF6B00]" />
            <p className="text-sm">Preencha os dados do produto e gere título, SEO, bullets, FAQ e palavras-chave otimizadas.</p>
          </div>
        )}

        {result && (
          <>
            <div className="card p-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50">Título Otimizado</p>
                <CopyButton text={result.title} />
              </div>
              <p className="text-sm font-medium">{result.title}</p>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50">Bullets / Destaques</p>
                <CopyButton text={result.bullets.join("\n")} />
              </div>
              <ul className="text-sm space-y-1.5 text-[#F5F3EF]/85">
                {result.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            <div className="card p-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50">Descrição</p>
                <CopyButton text={result.description} />
              </div>
              <p className="text-sm text-[#F5F3EF]/85 whitespace-pre-line">{result.description}</p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Palavras-chave Sugeridas</p>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((k, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-[#123C4A]/40 text-xs text-[#F5F3EF]/80">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">FAQ Sugerido</p>
              <div className="space-y-3">
                {result.faq.map((f, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{f.q}</p>
                    <p className="text-sm text-[#F5F3EF]/60">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Sugestões de Melhoria (SEO)</p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-[#F5F3EF]/80">
                {result.seoTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
