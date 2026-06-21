"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORM_OPTIONS = [
  { key: "mercado_livre", label: "Mercado Livre" },
  { key: "shopee", label: "Shopee" },
];

type Employee = { id: number; name: string };
type Client = {
  id: number;
  razao_social: string;
  responsavel: string | null;
  platforms: string[];
  status: string;
  employees: { id: number; name: string }[];
};

export default function ClientesPanel({ clients, employees }: { clients: Client[]; employees: Employee[] }) {
  const router = useRouter();
  const [razaoSocial, setRazaoSocial] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  function togglePlatform(key: string) {
    setPlatforms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  function toggleEmployee(id: number) {
    setEmployeeIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!razaoSocial) return;
    setSaving(true);
    try {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razao_social: razaoSocial, responsavel, platforms, employee_ids: employeeIds }),
      });
      setRazaoSocial("");
      setResponsavel("");
      setPlatforms([]);
      setEmployeeIds([]);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleClientEmployee(client: Client, empId: number) {
    const current = client.employees.map((e) => e.id);
    const next = current.includes(empId) ? current.filter((id) => id !== empId) : [...current, empId];
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_ids: next }),
    });
    router.refresh();
  }

  async function handleDelete(clientId: number) {
    if (!confirm("Excluir este cliente? Os registros de produtividade já feitos continuam guardados, mas perdem o vínculo com o cliente.")) return;
    await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="card p-6 space-y-3">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-1">Cadastrar Cliente</p>
        <input
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          placeholder="Razão social"
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
        />
        <input
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Responsável"
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
        />
        <div>
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Plataformas que fazemos a gestão</p>
          <div className="flex gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePlatform(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  platforms.includes(p.key) ? "bg-[#FF6B00] text-[#0F0F10] font-medium" : "bg-white/5 text-[#F5F3EF]/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-2">Funcionários responsáveis</p>
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => toggleEmployee(emp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  employeeIds.includes(emp.id) ? "bg-[#FF6B00] text-[#0F0F10] font-medium" : "bg-white/5 text-[#F5F3EF]/60"
                }`}
              >
                {emp.name}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-medium hover:bg-[#ff7d1f] transition disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Cadastrar"}
        </button>
      </form>

      <div className="card p-6">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">Clientes ({clients.length})</p>
        <div className="space-y-4">
          {clients.length === 0 ? (
            <p className="text-sm text-[#F5F3EF]/40">Nenhum cliente cadastrado.</p>
          ) : (
            clients.map((c) => (
              <div key={c.id} className="border-b border-white/5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{c.razao_social}</p>
                    <p className="text-xs text-[#F5F3EF]/40">{c.responsavel || "Sem responsável definido"}</p>
                    <div className="flex gap-1 mt-1">
                      {c.platforms.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#F5F3EF]/60">
                          {PLATFORM_OPTIONS.find((o) => o.key === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition"
                  >
                    Excluir
                  </button>
                </div>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/40 mb-2">Funcionários atribuídos</p>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((emp) => {
                      const assigned = c.employees.some((e) => e.id === emp.id);
                      return (
                        <button
                          key={emp.id}
                          onClick={() => handleToggleClientEmployee(c, emp.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs transition ${
                            assigned ? "bg-[#FF6B00] text-[#0F0F10] font-medium" : "bg-white/5 text-[#F5F3EF]/60"
                          }`}
                        >
                          {emp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
