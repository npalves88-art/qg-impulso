import { getSession } from "@/lib/auth";
import { getOperationalRadar } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { AlertOctagon, DollarSign, Percent, MessageSquareWarning } from "lucide-react";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dynamic = "force-dynamic";

export default async function RadarOperacionalPage() {
  const session = await getSession();
  const data = await getOperationalRadar(session!.companyId);

  return (
    <div>
      <PageHeader
        title="Radar Operacional"
        subtitle="Erros, reclamações, atrasos, devoluções e custo da falha operacional."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Taxa de Erro Operacional" value={`${data.errorRate}%`} icon={Percent} accent="orange" />
        <StatCard label="Custo Estimado das Falhas" value={BRL(data.totalCost)} icon={DollarSign} />
        <StatCard label="Erros em Aberto" value={String(data.openErrors)} icon={AlertOctagon} />
        <StatCard label="Reclamações em Aberto" value={String(data.openComplaints)} icon={MessageSquareWarning} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Erros por Tipo</p>
          <div className="space-y-2">
            {Object.entries(data.errorsByType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm w-44 text-[#F5F3EF]/70 truncate">{type}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-[#FF6B00]"
                    style={{ width: `${Math.min(100, (count / data.totalErrors) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-[#F5F3EF]/50 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Responsáveis por Falhas</p>
          <div className="space-y-2">
            {Object.entries(data.responsibleCount)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm w-44 text-[#F5F3EF]/70 truncate">{name}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[#1E6F86]"
                      style={{ width: `${Math.min(100, (count / data.totalErrors) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#F5F3EF]/50 w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Ocorrências Recentes</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
                <th className="py-2">Data</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Produto</th>
                <th className="py-2">Responsável</th>
                <th className="py-2">Custo</th>
                <th className="py-2">SLA</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.errors.slice(0, 15).map((e: any) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="py-2.5 text-[#F5F3EF]/60">{e.date}</td>
                  <td className="py-2.5">{e.type}</td>
                  <td className="py-2.5">{e.product_name || "-"}</td>
                  <td className="py-2.5">{e.employee_name || "-"}</td>
                  <td className="py-2.5">{BRL(e.estimated_cost)}</td>
                  <td className="py-2.5">{e.sla_hours}h</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        e.status === "resolvido"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Reclamações Recentes</p>
          <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
            {data.complaints.slice(0, 10).map((c: any) => (
              <div key={c.id} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <div>
                  <p className="text-sm">{c.reason}</p>
                  <p className="text-xs text-[#F5F3EF]/40">{c.product_name} · {c.marketplace_name}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full self-start ${
                    c.severity === "alta" ? "bg-red-500/15 text-red-400" : "bg-[#FF6B00]/15 text-[#FF6B00]"
                  }`}
                >
                  {c.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Atrasos e Devoluções</p>
          <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
            {data.delays.slice(0, 6).map((d: any) => (
              <div key={`d-${d.id}`} className="flex justify-between border-b border-white/5 pb-2">
                <p className="text-sm">{d.product_name} — atraso de {d.days_late}d</p>
                <span className="text-xs text-[#F5F3EF]/40">{d.reason}</span>
              </div>
            ))}
            {data.returns.slice(0, 6).map((r: any) => (
              <div key={`r-${r.id}`} className="flex justify-between border-b border-white/5 pb-2">
                <p className="text-sm">{r.product_name} — devolução</p>
                <span className="text-xs text-[#F5F3EF]/40">{BRL(r.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
