import { getSession } from "@/lib/auth";
import { getExecutiveDashboard } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import RevenueChart from "./RevenueChart";
import { DollarSign, ShoppingCart, Receipt, Percent, MousePointerClick, AlertTriangle } from "lucide-react";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const data = await getExecutiveDashboard(session!.companyId);

  return (
    <div>
      <PageHeader
        title="Dashboard Executivo"
        subtitle="Visão geral da operação nos últimos 7 dias."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Faturamento (7d)" value={BRL(data.revenue7)} icon={DollarSign} accent="orange" />
        <StatCard label="Pedidos (7d)" value={String(data.orders7)} icon={ShoppingCart} accent="petrol" />
        <StatCard label="Ticket Médio" value={BRL(data.avgTicket7)} icon={Receipt} />
        <StatCard label="Conversão Geral" value={`${data.conversion7.toFixed(2)}%`} icon={Percent} />
        <StatCard label="CTR Médio" value={`${data.ctr7.toFixed(2)}%`} icon={MousePointerClick} />
        <StatCard
          label="Taxa de Erro Operacional"
          value={`${data.errorRate7.toFixed(2)}%`}
          icon={AlertTriangle}
          trend={data.errorRate7 > 2 ? "Acima da meta" : "Dentro da meta"}
          trendUp={data.errorRate7 <= 2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Faturamento e Pedidos — últimos 30 dias</p>
          <RevenueChart chart={data.chart} />
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Alertas Estratégicos</p>
          <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
            {data.alerts.length === 0 && (
              <p className="text-sm text-[#F5F3EF]/40">Nenhum alerta ativo.</p>
            )}
            {data.alerts.map((a: any) => (
              <div key={a.id} className="flex gap-3 items-start">
                <span
                  className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    a.severity === "alta"
                      ? "bg-red-500"
                      : a.severity === "media"
                      ? "bg-[#FF6B00]"
                      : "bg-[#F5F3EF]/30"
                  }`}
                />
                <p className="text-sm text-[#F5F3EF]/80 leading-snug">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm font-medium mb-3 text-[#F5F3EF]/80">Resumo de Reclamações</p>
          <p className="text-3xl font-semibold">{data.openComplaints}</p>
          <p className="text-xs text-[#F5F3EF]/45 mt-1">reclamações em aberto</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium mb-3 text-[#F5F3EF]/80">Erros Operacionais</p>
          <p className="text-3xl font-semibold">{data.openErrors}</p>
          <p className="text-xs text-[#F5F3EF]/45 mt-1">erros em aberto</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium mb-3 text-[#F5F3EF]/80">Atrasos e Devoluções (7d)</p>
          <p className="text-3xl font-semibold">{data.delaysCount + data.returnsCount}</p>
          <p className="text-xs text-[#F5F3EF]/45 mt-1">
            {data.delaysCount} atrasos · {data.returnsCount} devoluções
          </p>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Produtos Críticos (estoque baixo)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
                <th className="py-2">Produto</th>
                <th className="py-2">Estoque</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.criticalProducts.map((p: any) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-2.5">{p.name}</td>
                  <td className="py-2.5">{p.stock}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-1 rounded-full bg-red-500/15 text-red-400 text-xs">
                      Estoque crítico
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
