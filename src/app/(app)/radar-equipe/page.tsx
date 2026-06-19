import { getSession } from "@/lib/auth";
import { getTeamRadar } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Trophy, Boxes, Image as ImageIcon, PackageCheck, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RadarEquipePage() {
  const session = await getSession();
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
