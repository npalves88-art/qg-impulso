"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistroDoDiaForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    skus_worked: "",
    ads_created: "",
    images_made: "",
    orders_picked: "",
    orders_shipped: "",
    self_score: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/team-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "skus_worked", label: "SKUs trabalhados" },
    { key: "ads_created", label: "Anúncios criados" },
    { key: "images_made", label: "Imagens feitas" },
    { key: "orders_picked", label: "Pedidos separados" },
    { key: "orders_shipped", label: "Pedidos enviados" },
  ];

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <p className="text-sm font-medium text-[#F5F3EF]/80">Registro do Dia</p>
      <p className="text-xs text-[#F5F3EF]/40">
        Lance suas atividades de hoje. Pode atualizar quantas vezes precisar — o registro do dia é substituído.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">{f.label}</label>
            <input
              type="number"
              min={0}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            />
          </div>
        ))}
      </div>
      {success && <p className="text-sm text-emerald-400">Registro de hoje salvo.</p>}
      <button
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-medium hover:bg-[#ff7d1f] transition disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar registro de hoje"}
      </button>
    </form>
  );
}
