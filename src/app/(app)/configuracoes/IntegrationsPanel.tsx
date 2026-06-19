"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Link2, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

type Integration = {
  marketplace: "mercado_livre" | "shopee";
  status: "desconectado" | "aguardando_autorizacao" | "conectado" | "erro";
  hasCredentials: boolean;
  shopId: string | null;
  sellerId: string | null;
  lastSyncAt: string | null;
  lastSyncSummary: string | null;
};

const LABELS: Record<string, string> = {
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
};

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[#F5F3EF]/40">{label}</p>
        <p className="text-xs text-[#F5F3EF]/80 truncate">{url}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
      >
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function CredentialsForm({
  marketplace,
  onSaved,
}: {
  marketplace: "mercado_livre" | "shopee";
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [shopId, setShopId] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace, client_id: clientId, client_secret: clientSecret, shop_id: shopId }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 mt-4">
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">
          {marketplace === "mercado_livre" ? "App ID (Client ID)" : "Partner ID"}
        </label>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
          placeholder={marketplace === "mercado_livre" ? "Ex: 1234567890123456" : "Ex: 1000000"}
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">
          {marketplace === "mercado_livre" ? "Client Secret" : "Partner Key"}
        </label>
        <input
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          type="password"
          className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
        />
      </div>
      {marketplace === "shopee" && (
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#F5F3EF]/50 mb-1">Shop ID (opcional)</label>
          <input
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-[#FF6B00]"
          />
        </div>
      )}
      <button
        disabled={saving}
        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar credenciais"}
      </button>
    </form>
  );
}

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<Record<string, string>>({});
  const searchParams = useSearchParams();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/integrations/status");
    const data = await res.json();
    setIntegrations(data.integrations || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const connectedMsg = searchParams.get("connected");
  const errorMsg = searchParams.get("error");

  async function handleSync(marketplace: "mercado_livre" | "shopee") {
    setSyncing(marketplace);
    try {
      const res = await fetch(`/api/integrations/${marketplace === "mercado_livre" ? "mercadolivre" : "shopee"}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      setSyncMessage((m) => ({ ...m, [marketplace]: data.summary || data.error }));
      load();
    } finally {
      setSyncing(null);
    }
  }

  function findIntegration(marketplace: string): Integration | undefined {
    return integrations.find((i) => i.marketplace === marketplace);
  }

  return (
    <div className="space-y-6">
      {connectedMsg && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> {LABELS[connectedMsg]} conectado com sucesso.
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={16} /> Erro: {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(["mercado_livre", "shopee"] as const).map((mp) => {
          const integration = findIntegration(mp);
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const prefix = mp === "mercado_livre" ? "mercadolivre" : "shopee";
          return (
            <div key={mp} className="card p-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[#F5F3EF]/80">{LABELS[mp]}</p>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    integration?.status === "conectado"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : integration?.status === "erro"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-white/10 text-[#F5F3EF]/50"
                  }`}
                >
                  {integration?.status === "conectado"
                    ? "Conectado"
                    : integration?.status === "aguardando_autorizacao"
                    ? "Aguardando autorização"
                    : integration?.status === "erro"
                    ? "Erro"
                    : "Desconectado"}
                </span>
              </div>

              {!loading && !integration?.hasCredentials && (
                <p className="text-xs text-[#F5F3EF]/40 mb-2">
                  Cadastre as credenciais do app criado no painel de desenvolvedores{" "}
                  {mp === "mercado_livre" ? "do Mercado Livre" : "da Shopee Open Platform"} para iniciar a conexão.
                </p>
              )}

              <div className="space-y-2 mb-4">
                <CopyableUrl label="URL de retorno (Redirect URI)" url={`${origin}/api/integrations/${prefix}/callback`} />
                {mp === "mercado_livre" && (
                  <CopyableUrl
                    label="URL de retornos de chamada de notificação"
                    url={`${origin}/api/integrations/${prefix}/notifications`}
                  />
                )}
              </div>

              <CredentialsForm marketplace={mp} onSaved={load} />

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <a
                  href={`/api/integrations/${mp === "mercado_livre" ? "mercadolivre" : "shopee"}/connect`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B00] text-[#0F0F10] text-sm font-medium hover:bg-[#ff7d1f] transition"
                >
                  <Link2 size={15} />
                  {integration?.status === "conectado" ? "Reconectar" : "Conectar"}
                </a>
                <button
                  onClick={() => handleSync(mp)}
                  disabled={integration?.status !== "conectado" || syncing === mp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition disabled:opacity-40"
                >
                  <RefreshCw size={15} className={syncing === mp ? "animate-spin" : ""} />
                  {syncing === mp ? "Sincronizando..." : "Sincronizar agora"}
                </button>
              </div>

              {integration?.lastSyncAt && (
                <p className="text-xs text-[#F5F3EF]/40 mt-3">
                  Última sincronização: {new Date(integration.lastSyncAt).toLocaleString("pt-BR")} — {integration.lastSyncSummary}
                </p>
              )}
              {syncMessage[mp] && <p className="text-xs text-[#F5F3EF]/50 mt-2">{syncMessage[mp]}</p>}
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-2">Como funciona</p>
        <ol className="text-sm text-[#F5F3EF]/60 list-decimal list-inside space-y-1">
          <li>Crie um aplicativo no painel de desenvolvedores do marketplace e copie as credenciais.</li>
          <li>Cole as credenciais aqui e clique em "Conectar" — você será redirecionado para autorizar o acesso.</li>
          <li>Após autorizar, volte a esta tela e clique em "Sincronizar agora" para importar anúncios e métricas reais.</li>
          <li>Enquanto não conectado, a plataforma continua exibindo os dados simulados para demonstração.</li>
        </ol>
      </div>
    </div>
  );
}
