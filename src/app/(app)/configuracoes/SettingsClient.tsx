"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IntegrationsPanel from "./IntegrationsPanel";

type Tab = "empresa" | "equipe" | "produtos" | "usuarios" | "integracoes";

export default function SettingsClient({
  company,
  employees,
  products,
  users,
  currentUser,
}: {
  company: any;
  employees: any[];
  products: any[];
  users: any[];
  currentUser: { name: string; role: string; email: string };
}) {
  const [tab, setTab] = useState<Tab>("empresa");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [deletingProducts, setDeletingProducts] = useState(false);

  function toggleProductSelection(id: number) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleSelectAllProducts() {
    setSelectedProductIds((prev) =>
      prev.length === products.length ? [] : products.map((p) => p.id)
    );
  }

  async function handleDeleteSelectedProducts() {
    if (selectedProductIds.length === 0) return;
    if (!confirm(`Excluir ${selectedProductIds.length} produto(s) selecionado(s)? Essa ação não pode ser desfeita.`)) return;
    setDeletingProducts(true);
    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedProductIds }),
      });
      setSelectedProductIds([]);
      router.refresh();
    } finally {
      setDeletingProducts(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("tab") === "integracoes") {
      setTab("integracoes");
    }
  }, [searchParams]);

  const [companyForm, setCompanyForm] = useState({
    name: company?.name || "",
    cnpj: company?.cnpj || "",
    segment: company?.segment || "",
  });

  const [employeeForm, setEmployeeForm] = useState({ name: "", role: "", area: "Marketing", email: "" });
  const [productForm, setProductForm] = useState({ name: "", category: "", cost_price: "", sale_price: "", stock: "" });
  const [status, setStatus] = useState("");

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(companyForm) });
    setStatus("Empresa atualizada.");
    router.refresh();
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(employeeForm) });
    if (res.ok) {
      setEmployeeForm({ name: "", role: "", area: "Marketing", email: "" });
      setStatus("Colaborador cadastrado.");
      router.refresh();
    }
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productForm) });
    if (res.ok) {
      setProductForm({ name: "", category: "", cost_price: "", sale_price: "", stock: "" });
      setStatus("Produto cadastrado.");
      router.refresh();
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "empresa", label: "Empresa" },
    { key: "equipe", label: "Equipe" },
    { key: "produtos", label: "Produtos" },
    { key: "integracoes", label: "Integrações" },
    { key: "usuarios", label: "Usuários" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              tab === t.key ? "bg-[#FF6B00] text-[#0F0F10] font-medium" : "bg-white/5 text-[#F5F3EF]/70 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {status && <p className="text-sm text-emerald-400 mb-4">{status}</p>}

      {tab === "empresa" && (
        <form onSubmit={saveCompany} className="card p-6 max-w-lg space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Razão Social</label>
            <input
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">CNPJ</label>
            <input
              value={companyForm.cnpj}
              onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Segmento</label>
            <input
              value={companyForm.segment}
              onChange={(e) => setCompanyForm({ ...companyForm, segment: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            />
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-medium hover:bg-[#ff7d1f] transition">
            Salvar
          </button>
        </form>
      )}

      {tab === "equipe" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={addEmployee} className="card p-6 space-y-4">
            <p className="text-sm font-medium text-[#F5F3EF]/80">Cadastrar Colaborador</p>
            <input
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              placeholder="Nome completo"
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              required
            />
            <input
              value={employeeForm.role}
              onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
              placeholder="Função (ex: Designer)"
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              required
            />
            <select
              value={employeeForm.area}
              onChange={(e) => setEmployeeForm({ ...employeeForm, area: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            >
              {["Marketing", "Operação", "Atendimento", "Financeiro"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <input
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              placeholder="E-mail (opcional)"
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            />
            <button className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-medium hover:bg-[#ff7d1f] transition">
              Cadastrar
            </button>
          </form>

          <div className="card p-6">
            <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">Colaboradores ({employees.length})</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {employees.map((e) => (
                <div key={e.id} className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-sm">{e.name}</span>
                  <span className="text-xs text-[#F5F3EF]/40">{e.role} · {e.area}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "produtos" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={addProduct} className="card p-6 space-y-4">
            <p className="text-sm font-medium text-[#F5F3EF]/80">Cadastrar Produto</p>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="Nome do produto"
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              required
            />
            <input
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              placeholder="Categoria"
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={productForm.cost_price}
                onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                placeholder="Preço de custo"
                type="number"
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              />
              <input
                value={productForm.sale_price}
                onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                placeholder="Preço de venda"
                type="number"
                className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
              />
            </div>
            <input
              value={productForm.stock}
              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              placeholder="Estoque"
              type="number"
              className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
            />
            <button className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-medium hover:bg-[#ff7d1f] transition">
              Cadastrar
            </button>
          </form>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-[#F5F3EF]/80">Produtos ({products.length})</p>
                {products.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-[#F5F3EF]/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.length === products.length}
                      onChange={toggleSelectAllProducts}
                      className="accent-[#FF6B00]"
                    />
                    Selecionar todos
                  </label>
                )}
              </div>
              {selectedProductIds.length > 0 && (
                <button
                  onClick={handleDeleteSelectedProducts}
                  disabled={deletingProducts}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition disabled:opacity-50"
                >
                  {deletingProducts ? "Excluindo..." : `Excluir ${selectedProductIds.length} selecionado(s)`}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 justify-between border-b border-white/5 pb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProductSelection(p.id)}
                      className="accent-[#FF6B00]"
                    />
                    <span className="text-sm truncate">{p.name}</span>
                  </div>
                  <span className="text-xs text-[#F5F3EF]/40 shrink-0">{p.category} · estoque {p.stock}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "integracoes" && <IntegrationsPanel />}

      {tab === "usuarios" && (
        <div className="card p-6">
          <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">Usuários da Plataforma</p>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex justify-between border-b border-white/5 pb-2">
                <div>
                  <p className="text-sm">{u.name}</p>
                  <p className="text-xs text-[#F5F3EF]/40">{u.email}</p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${u.avatar_color}22`, color: u.avatar_color }}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#F5F3EF]/30 mt-4">
            Logado como {currentUser.name} ({currentUser.role}) — {currentUser.email}
          </p>
        </div>
      )}
    </div>
  );
}
