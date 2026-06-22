import StatCard from "@/components/StatCard";
import { Boxes, Megaphone, Search, Star } from "lucide-react";

export default function DashboardView({ data }: { data: any }) {
  const maxDay = Math.max(1, ...data.skusPorDiaUltimos7.map((d: any) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total de SKUs — Geral" value={String(data.totalSkus)} icon={Boxes} accent="orange" />
        <StatCard label="SKUs — Última Semana" value={String(data.weekSkus)} icon={Boxes} />
        <StatCard label="SKUs — Mês" value={String(data.monthSkus)} icon={Boxes} accent="petrol" />
        <StatCard label="Anúncios Criados" value={String(data.adsCreatedTotal)} icon={Megaphone} />
        <StatCard label="SEO Realizados" value={String(data.seoTotal)} icon={Search} />
        <StatCard label="Média Autoavaliação" value={`${data.avgScore.toFixed(1)} / 10`} icon={Star} accent="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">SKUs por Dia — Últimos 7</p>
          <div className="flex items-end gap-2 h-32">
            {data.skusPorDiaUltimos7.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#FF6B00] rounded-t"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? "4px" : "0px" }}
                />
                <span className="text-[10px] text-[#F5F3EF]/40">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">⚠ Ranking de Gargalos</p>
          {data.rankingGargalos.length === 0 ? (
            <p className="text-sm text-[#F5F3EF]/40">Nenhum gargalo registrado.</p>
          ) : (
            <div className="space-y-2">
              {data.rankingGargalos.map((g: any) => (
                <div key={g.label} className="flex items-center justify-between text-sm">
                  <span className="text-[#F5F3EF]/70">{g.label}</span>
                  <span className="text-[#F5F3EF]/40">{g.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-[#F5F3EF]/80 mb-4">Histórico Recente</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
                <th className="py-2">Data</th>
                {data.recentEntries[0]?.employeeName && <th className="py-2">Colaborador</th>}
                <th className="py-2">Cliente</th>
                <th className="py-2">SKUs</th>
                <th className="py-2">Anúncios</th>
                <th className="py-2">SEO</th>
                <th className="py-2">Imagens</th>
                <th className="py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-[#F5F3EF]/40">
                    Nenhum registro ainda.
                  </td>
                </tr>
              ) : (
                data.recentEntries.map((e: any, i: number) => (
                  <tr key={`${e.date}-${e.employeeName || ""}-${i}`} className="border-t border-white/5">
                    <td className="py-2.5">{e.date}</td>
                    {e.employeeName && <td className="py-2.5 font-medium">{e.employeeName}</td>}
                    <td className="py-2.5 text-[#F5F3EF]/60">{e.cliente || "-"}</td>
                    <td className="py-2.5">{e.skus}</td>
                    <td className="py-2.5">{e.ads}</td>
                    <td className="py-2.5">{e.seo}</td>
                    <td className="py-2.5">{e.images}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-1 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] text-xs font-medium">
                        {e.score ?? "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
