import { getSession } from "@/lib/auth";
import { getTeamRadar, getOwnProductivity } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Trophy, Boxes, PackageCheck } from "lucide-react";
import RegistroDoDiaForm from "./RegistroDoDiaForm";

export const dynamic = "force-dynamic";

export default async function RadarEquipePage() {
  const session = await getSession();
  const isManager = ["Administrador", "Gestor", "Analista"].includes(session!.role);

  if (!isManager) {
    const own = await getOwnProductivity(session!.userId);
    return (
      <div>
        <PageHeader
          title="Radar Equipe"
          subtitle={`Sua produtividade — ${session!.name}.`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RegistroDoDiaForm />

          <div className="space-y-4">
            {[
              { label: "Ontem", data: own.yesterday },
              { label: "Últimos 7 dias", data: own.last7Days },
              { label: "Último mês", data: own.lastMonth },
            ].map((period) => (
              <div key={period.label} className="card p-5">
                <p className="text-sm font-medium text-[#F5F3EF]/80 mb-3">{period.label}</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[#F5F3EF]/40 text-xs">SKUs</p>
                    <p className="font-semibold">{period.data.skus_worked}</p>
                  </div>
                  <div>
                    <p className="text-[#F5F3EF]/40 text-xs">Anúncios</p>
                    <p className="font-semibold">{period.data.ads_created}</p>
                  </div>
                  <div>
                    <p className="text-[#F5F3EF]/40 text-xs">Imagens</p>
                    <p className="font-semibold">{period.data.images_made}</p>
                  </div>
                  <div>
                    <p className="text-[#F5F3EF]/40 text-xs">Separados</p>
                    <p className="font-semibold">{period.data.orders_picked}</p>
                  </div>
                  <div>
                    <p className="text-[#F5F3EF]/40 text-xs">Enviados</p>
                    <p className="font-semibold">{period.data.orders_shipped}</p>
                  </div>
                  <div>
                    <p className="text-[#F5F3EF]/40 text-xs">Score</p>
                    <p className="font-semibold text-[#FF6B00]">{period.data.score.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { employees } = await getTeamRadar(session!.companyId);

  const totalScore = employees.reduce((s, e) => s + e.score, 0);
  const top = employees[0];

  return (
    <div>
      <PageHeader
        title="Radar Equipe"
        subtitle="Produtividade da equipe nos últimos 7 dias — atividades, ranking e score."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Colaboradores Ativos" value={String(employees.length)} icon={Boxes} />
        <StatCard label="Score Total da Equipe" value={totalScore.toFixed(1)} icon={Trophy} accent="orange" />
        <StatCard label="Top Performer" value={top?.name || "-"} icon={Trophy} accent="petrol" />
        <StatCard label="Pedidos Separados (7d)" value={String(employees.reduce((s, e) => s + e.orders_picked, 0))} icon={PackageCheck} />
      </div>

      <div className="mb-6">
        <RegistroDoDiaForm />
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Ranking de Produtividade</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
                <th className="py-2">#</th>
                <th className="py-2">Colaborador</th>
                <th className="py-2">Área</th>
                <th className="py-2">SKUs</th>
                <th className="py-2">Anúncios</th>
                <th className="py-2">Imagens</th>
                <th className="py-2">Separados</th>
                <th className="py-2">Enviados</th>
                <th className="py-2">Score</th>
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
                  <td className="py-2.5 text-[#F5F3EF]/60">{e.area}</td>
                  <td className="py-2.5">{e.skus_worked}</td>
                  <td className="py-2.5">{e.ads_created}</td>
                  <td className="py-2.5">{e.images_made}</td>
                  <td className="py-2.5">{e.orders_picked}</td>
                  <td className="py-2.5">{e.orders_shipped}</td>
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
    </div>
  );
}
