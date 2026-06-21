"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Falha ao alterar a senha.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 max-w-md space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Senha Atual</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
          required
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Nova Senha</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
          minLength={6}
          required
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Confirmar Nova Senha</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
          minLength={6}
          required
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">Senha alterada com sucesso.</p>}

      <button
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-[#0F0F10] font-medium hover:bg-[#ff7d1f] transition disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
