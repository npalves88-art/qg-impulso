"use client";

import { useMemo, useState } from "react";
import { Sparkles, Copy, Check, Download, FileText, RotateCcw } from "lucide-react";

type AiResult = {
  titleMl: string;
  titleShopee: string;
  bullets: string[];
  shortDescription: string;
  longDescription: string;
  effects: string;
  usage: string;
  faq: { q: string; a: string }[];
  keywords: string[];
  seoTips: string[];
};

const STEPS = [
  { id: 1, label: "Ficha Técnica" },
  { id: 2, label: "Palavras-chave" },
  { id: 3, label: "Títulos e Copy" },
  { id: 4, label: "Exportar" },
] as const;

const INITIAL_FORM = {
  nome: "",
  categoria: "",
  fornecedor: "",
  plataforma: "Mercado Livre",
  sku: "",
  ean: "",
  medidas: "",
  peso: "",
  material: "",
  cor: "",
  voltagem: "",
  compatibilidade: "",
  qtdKit: "",
  observacoes: "",
  palavrasPrincipais: "",
  termosBusca: "",
  nomesSemelhantes: "",
  palavrasReferencias: "",
  duvidasClientes: "",
  tituloMl: "",
  tituloShopee: "",
  descCurta: "",
  descCompleta: "",
  efeitos: "",
  modoUso: "",
  perguntas: "",
};

type FormState = typeof INITIAL_FORM;

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  rows = 2,
  mono,
  maxLength,
  counter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  mono?: boolean;
  maxLength?: number;
  counter?: string;
}) {
  const base =
    "w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] transition" +
    (mono ? " font-mono" : "");
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50">{label}</label>
        {counter && <span className="text-[10px] font-mono text-[#F5F3EF]/40">{counter}</span>}
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={base + " resize-none"}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={base}
        />
      )}
    </div>
  );
}

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

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 52;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto mb-4">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle
          stroke="rgba(245,243,239,0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#FF6B00"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 0.4s ease" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-[#F5F3EF]">{percentage}%</span>
        <span className="text-[10px] uppercase tracking-wide text-[#F5F3EF]/40">Pronto</span>
      </div>
    </div>
  );
}

function getFieldsData(form: FormState) {
  return [
    ["--- FICHA TÉCNICA ---"],
    ["Nome do Produto", form.nome],
    ["Categoria", form.categoria],
    ["Fornecedor", form.fornecedor],
    ["Plataforma Desejada", form.plataforma],
    ["SKU", form.sku],
    ["EAN", form.ean],
    ["Medidas", form.medidas],
    ["Peso", form.peso],
    ["Composição/Material", form.material],
    ["Cor", form.cor],
    ["Voltagem", form.voltagem],
    ["Compatibilidade", form.compatibilidade],
    ["Quantidade por kit", form.qtdKit],
    ["Observações Importantes", form.observacoes],
    ["--- PALAVRAS-CHAVE ---"],
    ["Palavras Principais", form.palavrasPrincipais],
    ["Termos de Busca", form.termosBusca],
    ["Nomes Semelhantes", form.nomesSemelhantes],
    ["Palavras referências", form.palavrasReferencias],
    ["Dúvidas clientes", form.duvidasClientes],
    ["--- TÍTULO E COPY ---"],
    ["Título Mercado Livre", form.tituloMl],
    ["Título Shopee", form.tituloShopee],
    ["Descrição Curta", form.descCurta],
    ["Descrição Completa", form.descCompleta],
    ["Efeitos Principais", form.efeitos],
    ["Modo de Uso", form.modoUso],
    ["Perguntas", form.perguntas],
  ] as [string, string?][];
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdGeneratorForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exportFeedback, setExportFeedback] = useState("");

  function setField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const percentage = useMemo(() => {
    const values = Object.values(form);
    const filled = values.filter((v) => v.trim() !== "").length;
    return Math.round((filled / values.length) * 100);
  }, [form]);

  async function handleGenerate() {
    if (!form.nome) {
      setStep(1);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ad-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: form.nome,
          category: form.categoria,
          marketplace: form.plataforma === "Shopee" ? "shopee" : form.plataforma === "Ambos" ? "ambos" : "ml",
          audience: form.duvidasClientes,
          differentials: form.observacoes,
          currentTitleMl: form.tituloMl,
          currentTitleShopee: form.tituloShopee,
          material: form.material,
          mainKeywords: form.palavrasPrincipais,
          similarNames: form.nomesSemelhantes,
          referenceWords: form.palavrasReferencias,
          customerDoubts: form.duvidasClientes,
        }),
      });
      const data: AiResult = await res.json();
      setAiResult(data);
      setForm((f) => ({
        ...f,
        palavrasPrincipais: f.palavrasPrincipais || data.keywords.slice(0, 5).join(", "),
        tituloMl: data.titleMl,
        tituloShopee: data.titleShopee,
        descCurta: data.shortDescription,
        descCompleta: data.longDescription,
        efeitos: data.effects,
        modoUso: data.usage,
        perguntas: data.faq.map((f2) => `${f2.q}\n${f2.a}`).join("\n\n"),
      }));
      setStep(3);
    } finally {
      setGenerating(false);
    }
  }

  function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text: string) {
    const tempArea = document.createElement("textarea");
    tempArea.value = text;
    tempArea.style.position = "fixed";
    tempArea.style.left = "-9999px";
    document.body.appendChild(tempArea);
    tempArea.focus();
    tempArea.select();
    try {
      document.execCommand("copy");
    } catch {
      // clipboard unavailable in this context; user can still select the text manually
    }
    document.body.removeChild(tempArea);
  }

  function handleCopyAll() {
    const fields = getFieldsData(form);
    const text = fields.map(([label, value]) => (value === undefined ? `${label}\n` : `${label}: ${value}\n`)).join("");
    copyTextToClipboard(text);
    setExportFeedback("Copiado para a área de transferência!");
    setTimeout(() => setExportFeedback(""), 2500);
  }

  function handleDownloadCsv() {
    const fields = getFieldsData(form);
    const csvContent =
      "﻿" +
      fields
        .map(([label, value]) => {
          const row = [label, value ?? ""];
          return row
            .map((cell) => {
              let cellStr = cell?.toString() || "";
              if (cellStr.includes(";") || cellStr.includes('"') || cellStr.includes("\n")) {
                cellStr = '"' + cellStr.replace(/"/g, '""') + '"';
              }
              return cellStr;
            })
            .join(";");
        })
        .join("\n");
    triggerDownload(csvContent, `Anuncio_${(form.nome || "Produto").replace(/\s+/g, "_")}.csv`, "text/csv;charset=utf-8;");
    setExportFeedback("CSV baixado!");
    setTimeout(() => setExportFeedback(""), 2500);
  }

  function handleDownloadTxt() {
    const fields = getFieldsData(form);
    const text = fields.map(([label, value]) => (value === undefined ? `${label}\n` : `${label}: ${value}\n`)).join("");
    triggerDownload(text, `Anuncio_${(form.nome || "Produto").replace(/\s+/g, "_")}.txt`, "text/plain;charset=utf-8;");
    setExportFeedback("TXT baixado!");
    setTimeout(() => setExportFeedback(""), 2500);
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setAiResult(null);
    setStep(1);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="card p-6 sticky top-8">
          <h2 className="text-sm font-semibold text-[#F5F3EF]/80 mb-4">Progresso</h2>
          <ProgressRing percentage={percentage} />

          <nav className="space-y-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 ${
                  step === s.id
                    ? "bg-[#FF6B00] text-[#0F0F10]"
                    : "text-[#F5F3EF]/60 hover:bg-white/5"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    step === s.id ? "bg-black/20" : "border border-white/15"
                  }`}
                >
                  {s.id}
                </span>
                {s.label}
              </button>
            ))}
          </nav>

          <button
            onClick={handleGenerate}
            disabled={generating || !form.nome}
            className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-semibold hover:bg-[#ff7d1f] transition disabled:opacity-50"
          >
            <Sparkles size={16} />
            {generating ? "Gerando..." : "Gerar com IA"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="card p-6 md:p-8">
          {step === 1 && (
            <section className="space-y-5">
              <h3 className="text-lg font-semibold flex items-center gap-2">📋 Ficha Técnica Base</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field label="Nome do Produto *" value={form.nome} onChange={(v) => setField("nome", v)} placeholder="Ex: Garrafa Térmica Inox 1L" />
                </div>
                <Field label="Categoria" value={form.categoria} onChange={(v) => setField("categoria", v)} placeholder="Ex: Casa e Cozinha" />
                <Field label="Fornecedor" value={form.fornecedor} onChange={(v) => setField("fornecedor", v)} />
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Plataforma Desejada</label>
                  <select
                    value={form.plataforma}
                    onChange={(e) => setField("plataforma", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
                  >
                    <option>Mercado Livre</option>
                    <option>Shopee</option>
                    <option>Ambos</option>
                  </select>
                </div>
                <Field label="SKU" value={form.sku} onChange={(v) => setField("sku", v)} mono />
                <Field label="EAN (se houver)" value={form.ean} onChange={(v) => setField("ean", v)} mono />
                <Field label="Medidas (C x L x A)" value={form.medidas} onChange={(v) => setField("medidas", v)} />
                <Field label="Peso" value={form.peso} onChange={(v) => setField("peso", v)} />
                <Field label="Composição/Material" value={form.material} onChange={(v) => setField("material", v)} />
                <Field label="Cor" value={form.cor} onChange={(v) => setField("cor", v)} />
                <Field label="Voltagem" value={form.voltagem} onChange={(v) => setField("voltagem", v)} />
                <Field label="Compatibilidade" value={form.compatibilidade} onChange={(v) => setField("compatibilidade", v)} />
                <Field label="Quantidade por kit" value={form.qtdKit} onChange={(v) => setField("qtdKit", v)} />
                <div className="md:col-span-2">
                  <Field label="Observações Importantes / Diferenciais" value={form.observacoes} onChange={(v) => setField("observacoes", v)} textarea rows={3} placeholder="Ex: bateria 30h, resistente à água (separe por vírgula)" />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <h3 className="text-lg font-semibold flex items-center gap-2">🔑 Estratégia de Busca (SEO)</h3>
              <Field label="Palavras Principais" value={form.palavrasPrincipais} onChange={(v) => setField("palavrasPrincipais", v)} placeholder="Ex: garrafa térmica inox" />
              <Field label="Termos de Busca" value={form.termosBusca} onChange={(v) => setField("termosBusca", v)} textarea rows={2} />
              <Field label="Nomes Semelhantes" value={form.nomesSemelhantes} onChange={(v) => setField("nomesSemelhantes", v)} />
              <Field label="Palavras utilizadas pelas referências" value={form.palavrasReferencias} onChange={(v) => setField("palavrasReferencias", v)} textarea rows={2} />
              <Field label="Dúvidas dos clientes / Público-alvo" value={form.duvidasClientes} onChange={(v) => setField("duvidasClientes", v)} textarea rows={2} placeholder="Ex: pessoas ativas que praticam esportes; resiste à água?" />

              {aiResult && (
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Palavras-chave sugeridas pela IA</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.keywords.map((k, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#123C4A]/40 text-xs text-[#F5F3EF]/80">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <h3 className="text-lg font-semibold flex items-center gap-2">✍️ Títulos e Copywriting</h3>

              <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                <Field
                  label="Título Mercado Livre"
                  value={form.tituloMl}
                  onChange={(v) => setField("tituloMl", v)}
                  maxLength={60}
                  counter={`${form.tituloMl.length} / 60`}
                />
              </div>

              <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                <Field
                  label="Título Shopee"
                  value={form.tituloShopee}
                  onChange={(v) => setField("tituloShopee", v)}
                  maxLength={120}
                  counter={`${form.tituloShopee.length} / 120`}
                />
              </div>

              <Field label="Descrição Curta" value={form.descCurta} onChange={(v) => setField("descCurta", v)} textarea rows={2} />
              <Field label="Descrição Completa" value={form.descCompleta} onChange={(v) => setField("descCompleta", v)} textarea rows={6} />
              <Field label="Efeitos Principais" value={form.efeitos} onChange={(v) => setField("efeitos", v)} textarea rows={3} />
              <Field label="Modo de Uso" value={form.modoUso} onChange={(v) => setField("modoUso", v)} textarea rows={2} />
              <Field label="Perguntas (FAQ)" value={form.perguntas} onChange={(v) => setField("perguntas", v)} textarea rows={4} />

              {aiResult && (
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Dicas de SEO da IA</p>
                  <ul className="text-sm space-y-1.5 list-disc list-inside text-[#F5F3EF]/70">
                    {aiResult.seoTips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="text-center py-6">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-full">
                <Check size={28} />
              </div>
              <h3 className="text-lg font-semibold">Formulário Completo!</h3>
              <p className="text-sm text-[#F5F3EF]/50 mb-8">Exporte os dados do anúncio no formato que preferir.</p>

              <div className="flex flex-col md:flex-row gap-3 justify-center">
                <button
                  onClick={handleCopyAll}
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-[#F5F3EF] px-6 py-3 rounded-xl font-medium transition"
                >
                  <Copy size={16} />
                  Copiar Tudo (Texto)
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600/80 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition"
                >
                  <Download size={16} />
                  Baixar Planilha (CSV)
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center justify-center gap-2 bg-[#123C4A] hover:bg-[#1a5266] text-white px-6 py-3 rounded-xl font-medium transition"
                >
                  <FileText size={16} />
                  Baixar Arquivo (TXT)
                </button>
              </div>

              {exportFeedback && <p className="text-sm text-emerald-400 mt-4">{exportFeedback}</p>}

              <div className="mt-10 pt-6 border-t border-white/10">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-sm text-[#F5F3EF]/40 hover:text-red-400 transition"
                >
                  <RotateCcw size={14} />
                  Limpar todos os dados e iniciar um novo anúncio
                </button>
              </div>
            </section>
          )}

          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={`px-5 py-2 rounded-xl font-medium text-[#F5F3EF]/50 hover:bg-white/5 transition ${
                step === 1 ? "opacity-0 pointer-events-none" : ""
              }`}
            >
              ← Anterior
            </button>
            {step < 4 && (
              <button
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="bg-[#FF6B00] text-[#0F0F10] px-6 py-2 rounded-xl font-semibold hover:bg-[#ff7d1f] transition"
              >
                Próximo Passo →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
