"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  ShieldAlert,
  TrendingUp,
  Store,
  Gauge,
  Bot,
  Settings,
  KeyRound,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard Executivo", icon: LayoutDashboard },
  { href: "/anuncio-turbo", label: "Anúncio Turbo", icon: Megaphone },
  { href: "/radar-equipe", label: "Radar Equipe", icon: Users },
  { href: "/radar-operacional", label: "Radar Operacional", icon: ShieldAlert },
  { href: "/radar-negocio", label: "Radar Negócio", icon: TrendingUp },
  { href: "/performance-marketplace", label: "Performance Marketplace", icon: Store },
  { href: "/central-indicadores", label: "Central de Indicadores", icon: Gauge },
  { href: "/ia-impulso", label: "IA Impulso", icon: Bot },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/alterar-senha", label: "Alterar Senha", icon: KeyRound },
];

// Operador only sees this subset (matches the proxy.ts allowlist).
const OPERADOR_NAV_ITEMS = [
  { href: "/anuncio-turbo", label: "Anúncio Turbo", icon: Megaphone },
  { href: "/radar-equipe", label: "Radar Equipe", icon: Users },
  { href: "/ia-impulso", label: "IA Impulso", icon: Bot },
  { href: "/alterar-senha", label: "Alterar Senha", icon: KeyRound },
];

export default function Sidebar({
  user,
  logoUrl,
}: {
  user: { name: string; role: string; avatarColor: string };
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = user.role === "Operador" ? OPERADOR_NAV_ITEMS : NAV_ITEMS;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-72 flex-col border-r border-white/5 bg-[#0F0F10] h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center gap-2">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white/5" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-[#FF6B00] flex items-center justify-center font-bold text-[#0F0F10]">
            Q
          </div>
        )}
        <div>
          <p className="font-semibold leading-tight">QG Impulso</p>
          <p className="text-[10px] text-[#F5F3EF]/40 uppercase tracking-wide">Centro de Comando</p>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto scrollbar-thin">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                active
                  ? "bg-[#FF6B00]/15 text-[#FF6B00] font-medium"
                  : "text-[#F5F3EF]/65 hover:bg-white/5 hover:text-[#F5F3EF]"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-[#0F0F10]"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-[#F5F3EF]/40">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#F5F3EF]/60 hover:bg-white/5 hover:text-[#F5F3EF] transition"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
