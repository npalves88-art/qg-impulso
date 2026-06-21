import { getSession } from "@/lib/auth";
import { getTeamRadar, getOwnDashboard } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Trophy, Boxes, Image as ImageIcon } from "lucide-react";
import OwnRadarTabs from "./OwnRadarTabs";

export const dynamic = "force-dynamic";

export default async function RadarEquipePage() {
  const session = await getSession();
  const isManager = ["Administrador", "Gestor", "Analista"].includes(session!.role);
  const dashboardData = await getOwnDashboard(session!.userId);

  if (!isManager) {
    return (
      <div>
        <PageHeader title="Radar Equipe" subtitle={`Sua produtividade — ${session!.name}.`} />
        <OwnRadarTabs dashboardData={dashboardData} />
      </div>
    );
  }

  const { employees } = await getTeamRadar(session!.companyId);

  const totalScore = employees.length
    ? +(employees.reduce((s, e) => s + e.score, 0) / employees.length).toFixed(1)
    : 0;
  const top = employees[0];

  return (
    <div>
      <PageHeader
        title="Radar Equipe"
        subtitle="Produtividade da equipe nos últimos 7 dias — atividades, ranking e score."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Colaboradores Ativos" value={String(employees.length)} icon={Boxes} />
        <StatCard label="Nota Média da Equipe" value={totalScore.toFixed(1)} icon={Trophy} accent="orange" />
        <StatCard label="Top Performer" value={top?.name || "-"} icon={Trophy} accent="petrol" />
        <StatCard label="Imagens Feitas (7d)" value={String(employees.reduce((s, e) => s + e.images_made, 0))} icon={ImageIcon} />
      </div>

      <div className="card p-5 mb-6">
        <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Ranking de Produtividade</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
                <th className="py-2">#</th>
                <th className="py-2">Colaborador</th>
                <th className="py-2">Área</th>
                <th className="py-2">SKUs</th>
                <th className="py-2">Anúncios</th>
                <th className="py-2">Imagens</th>
                <th className="py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="py-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        i === 0 ? "bg-[#FF6B00] text-[#0F0F10]" : "bg-white/5 text-[#F5F3EF]/60"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium">{e.name}</td>
                  <td className="py-2.5 text-[#F5F3EF]/60">{e.area || "-"}</td>
                  <td className="py-2.5">{e.skus_worked}</td>
                  <td className="py-2.5">{e.ads_created}</td>
                  <td className="py-2.5">{e.images_made}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-1 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] text-xs font-medium">
                      {e.score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">Seu Registro Pessoal</p>
      <OwnRadarTabs dashboardData={dashboardData} />
    </div>
  );
}
