import { getSession } from "@/lib/auth";
import { getCentralIndicadores } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  Users2,
  MousePointerClick,
  Percent,
  DollarSign,
  ShieldAlert,
  Trophy,
} from "lucide-react";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dynamic = "force-dynamic";

export default async function CentralIndicadoresPage() {
  const session = await getSession();
  const k = await getCentralIndicadores(session!.companyId);

  return (
    <div>
      <PageHeader
        title="Central de Indicadores"
        subtitle="KPIs consolidados de tráfego, engajamento, conversão, receita, operação e equipe."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/40 mb-3">Tráfego & Engajamento</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Visitas (30d)" value={k.traffic.toLocaleString("pt-BR")} icon={Users2} />
            <StatCard label="Cliques (30d)" value={k.engagement.toLocaleString("pt-BR")} icon={MousePointerClick} accent="orange" />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/40 mb-3">Conversão & Receita</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Conversão Geral" value={`${k.conversion.toFixed(2)}%`} icon={Percent} />
            <StatCard label="Faturamento (7d)" value={BRL(k.revenue)} icon={DollarSign} accent="petrol" />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/40 mb-3">Operação</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Taxa de Erro Operacional" value={`${k.errorRate}%`} icon={ShieldAlert} />
            <StatCard label="Erros + Reclamações Abertas" value={String(k.openErrors + k.openComplaints)} icon={ShieldAlert} />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/40 mb-3">Equipe</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Score Médio da Equipe" value={k.teamScoreAvg.toFixed(1)} icon={Trophy} accent="orange" />
            <StatCard label="CTR Médio" value={`${k.ctr.toFixed(2)}%`} icon={MousePointerClick} />
          </div>
        </div>
      </div>
    </div>
  );
}
