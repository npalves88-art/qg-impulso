"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIVITY_OPTIONS = [
  { key: "cadastro_produto", label: "Cadastro Produto" },
  { key: "criacao_anuncio", label: "Criação Anúncio" },
  { key: "revisao_anuncio", label: "Revisão Anúncio" },
  { key: "seo", label: "SEO" },
  { key: "criacao_imagens", label: "Criação Imagens" },
  { key: "edicao_imagens", label: "Edição Imagens" },
  { key: "video", label: "Vídeo" },
  { key: "pesquisa_concorrencia", label: "Pesquisa Concorrência" },
  { key: "correcao", label: "Correção" },
  { key: "atualizacao", label: "Atualização" },
  { key: "outro", label: "Outro" },
];

const GARGALO_OPTIONS = [
  "Falta de fotos",
  "Falta de ficha técnica",
  "Falta de acesso",
  "Falta de informações",
  "Problema plataforma",
  "Problema sistema",
  "Outro",
];

type SkuRow = { sku_code: string; product_name: string; activities: string[]; observacao: string };
type PendenciaRow = { sku_code: string; motivo: string };
type PlanejamentoRow = { sku_code: string; produto: string; atividade: string };

const emptySku = (): SkuRow => ({ sku_code: "", product_name: "", activities: [], observacao: "" });
const emptyPendencia = (): PendenciaRow => ({ sku_code: "", motivo: "" });
const emptyPlanejamento = (): PlanejamentoRow => ({ sku_code: "", produto: "", atividade: "" });

export default function RegistroDoDiaForm({ onSubmitted }: { onSubmitted?: (report: any) => void }) {
  const router = useRouter();
  const [cliente, setCliente] = useState("");
  const [skus, setSkus] = useState<SkuRow[]>([emptySku()]);
  const [pendencias, setPendencias] = useState<PendenciaRow[]>([]);
  const [planejamento, setPlanejamento] = useState<PlanejamentoRow[]>([]);
  const [gargalos, setGargalos] = useState<string[]>([]);
  const [gargalosDetalhamento, setGargalosDetalhamento] = useState("");
  const [selfScore, setSelfScore] = useState(7);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function toggleGargalo(g: string) {
    setGargalos((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function toggleSkuActivity(index: number, key: string) {
    setSkus((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, activities: s.activities.includes(key) ? s.activities.filter((a) => a !== key) : [...s.activities, key] }
          : s
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente,
          skus: skus.filter((s) => s.sku_code || s.product_name),
          pendencias: pendencias.filter((p) => p.sku_code || p.motivo),
          planejamento: planejamento.filter((p) => p.sku_code || p.produto),
          gargalos,
          gargalos_detalhamento: gargalosDetalhamento,
          self_score: selfScore,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        onSubmitted?.(data.report);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-3">Dados do Dia</p>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Cliente (opcional)</label>
        <input
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Nome do cliente/conta atendida hoje"
          className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
        />
      </div>

      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-1">01 · SKUs Trabalhados</p>
        <p className="text-xs text-[#F5F3EF]/40 mb-4">Registre cada SKU que você trabalhou hoje e as atividades feitas nele.</p>
        <div className="space-y-4">
          {skus.map((sku, i) => (
            <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#FF6B00]">SKU #{i + 1}</span>
                {skus.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSkus((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-[#F5F3EF]/40 hover:text-red-400 transition"
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Código SKU</label>
                  <input
                    value={sku.sku_code}
                    onChange={(e) =>
                      setSkus((prev) => prev.map((s, idx) => (idx === i ? { ...s, sku_code: e.target.value } : s)))
                    }
                    placeholder="ex: MAI025"
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Nome do Produto</label>
                  <input
                    value={sku.product_name}
                    onChange={(e) =>
                      setSkus((prev) => prev.map((s, idx) => (idx === i ? { ...s, product_name: e.target.value } : s)))
                    }
                    placeholder="Nome completo do produto"
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Atividade(s) Executada(s)</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => toggleSkuActivity(i, opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        sku.activities.includes(opt.key)
                          ? "bg-[#FF6B00]/15 border-[#FF6B00] text-[#FF6B00]"
                          : "bg-white/5 border-white/10 text-[#F5F3EF]/60 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Observação</label>
                <textarea
                  value={sku.observacao}
                  onChange={(e) =>
                    setSkus((prev) => prev.map((s, idx) => (idx === i ? { ...s, observacao: e.target.value } : s)))
                  }
                  rows={2}
                  placeholder="Opcional — detalhes relevantes"
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSkus((prev) => [...prev, emptySku()])}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-sm text-[#F5F3EF]/50 hover:bg-white/5 transition"
          >
            + Adicionar SKU
          </button>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">02 · Pendências</p>
        <div className="space-y-3">
          {pendencias.map((p, i) => (
            <div key={i} className="flex gap-3 items-start">
              <input
                value={p.sku_code}
                onChange={(e) => setPendencias((prev) => prev.map((x, idx) => (idx === i ? { ...x, sku_code: e.target.value } : x)))}
                placeholder="ex: MAI025"
                className="w-32 shrink-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] font-mono text-sm"
              />
              <input
                value={p.motivo}
                onChange={(e) => setPendencias((prev) => prev.map((x, idx) => (idx === i ? { ...x, motivo: e.target.value } : x)))}
                placeholder="ex: Aguardando fotos do cliente"
                className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              />
              <button
                type="button"
                onClick={() => setPendencias((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-[#F5F3EF]/40 hover:text-red-400 transition px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPendencias((prev) => [...prev, emptyPendencia()])}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-sm text-[#F5F3EF]/50 hover:bg-white/5 transition"
          >
            + Adicionar Pendência
          </button>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">03 · Gargalos Identificados</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {GARGALO_OPTIONS.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => toggleGargalo(g)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                gargalos.includes(g)
                  ? "bg-[#FF6B00]/15 border-[#FF6B00] text-[#FF6B00]"
                  : "bg-white/5 border-white/10 text-[#F5F3EF]/60 hover:bg-white/10"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Detalhamento</label>
        <textarea
          value={gargalosDetalhamento}
          onChange={(e) => setGargalosDetalhamento(e.target.value)}
          rows={2}
          placeholder="Descreva o impacto dos gargalos, se necessário..."
          className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] resize-none"
        />
      </div>

      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">04 · Planejamento Próximo Dia</p>
        <div className="space-y-3">
          {planejamento.map((item, i) => (
            <div key={i} className="flex gap-3 items-start flex-wrap">
              <input
                value={item.sku_code}
                onChange={(e) => setPlanejamento((prev) => prev.map((x, idx) => (idx === i ? { ...x, sku_code: e.target.value } : x)))}
                placeholder="ex: MAI026"
                className="w-32 shrink-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] font-mono text-sm"
              />
              <input
                value={item.produto}
                onChange={(e) => setPlanejamento((prev) => prev.map((x, idx) => (idx === i ? { ...x, produto: e.target.value } : x)))}
                placeholder="Nome do produto"
                className="flex-1 min-w-[150px] px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              />
              <select
                value={item.atividade}
                onChange={(e) => setPlanejamento((prev) => prev.map((x, idx) => (idx === i ? { ...x, atividade: e.target.value } : x)))}
                className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00] text-sm"
              >
                <option value="">Selecione</option>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPlanejamento((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-[#F5F3EF]/40 hover:text-red-400 transition px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPlanejamento((prev) => [...prev, emptyPlanejamento()])}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-sm text-[#F5F3EF]/50 hover:bg-white/5 transition"
          >
            + Adicionar Item
          </button>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">05 · Autoavaliação</p>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">
          Nota de produtividade do dia (1-10)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={10}
            value={selfScore}
            onChange={(e) => setSelfScore(Number(e.target.value))}
            className="flex-1 accent-[#FF6B00]"
          />
          <span className="text-2xl font-bold text-[#FF6B00] w-10 text-center">{selfScore}</span>
        </div>
      </div>

      {success && <p className="text-sm text-emerald-400">Relatório do dia salvo com sucesso.</p>}

      <button
        disabled={saving}
        className="w-full py-3 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-semibold hover:bg-[#ff7d1f] transition disabled:opacity-60"
      >
        {saving ? "Salvando..." : "⚡ Gerar Relatório do Dia"}
      </button>
    </form>
  );
}
