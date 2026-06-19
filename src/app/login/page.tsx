"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  { label: "Administrador", email: "admin@qgimpulso.com" },
  { label: "Gestor", email: "gestor@qgimpulso.com" },
  { label: "Operador", email: "operador@qgimpulso.com" },
  { label: "Analista", email: "analista@qgimpulso.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@qgimpulso.com");
  const [password, setPassword] = useState("impulso123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao entrar.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0F0F10] relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#123C4A] opacity-30 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#FF6B00] opacity-10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00] flex items-center justify-center font-bold text-[#0F0F10] text-lg">
              Q
            </div>
            <span className="text-2xl font-bold text-[#F5F3EF] tracking-tight">QG Impulso</span>
          </div>
          <p className="text-sm text-[#F5F3EF]/60 tracking-wide uppercase">
            O Comando do Seu Crescimento
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card p-8 shadow-2xl"
        >
          <h1 className="text-xl font-semibold mb-1 text-[#F5F3EF]">Acessar plataforma</h1>
          <p className="text-sm text-[#F5F3EF]/50 mb-6">Entre com suas credenciais para acessar o centro de comando.</p>

          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-[#F5F3EF] outline-none focus:border-[#FF6B00] transition"
            placeholder="seu@email.com"
            required
          />

          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-[#F5F3EF] outline-none focus:border-[#FF6B00] transition"
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-semibold hover:bg-[#ff7d1f] transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 card p-4">
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/40 mb-2">Acesso de demonstração</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPassword("impulso123");
                }}
                className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#F5F3EF]/80 transition"
              >
                <span className="block font-medium">{u.label}</span>
                <span className="block text-[#F5F3EF]/40">{u.email}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#F5F3EF]/30 mt-3">Senha para todos: impulso123</p>
        </div>
      </div>
    </div>
  );
}
