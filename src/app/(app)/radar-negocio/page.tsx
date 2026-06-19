import { getSession } from "@/lib/auth";
import { getBusinessRadar } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Crown, TrendingDown, PackageX, Layers } from "lucide-react";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dynamic = "force-dynamic";

export default async function RadarNegocioPage() {
  const session = await getSession();
  const data = await getBusinessRadar(session!.companyId);

  return (
    <div>
      <PageHeader
        title="Radar Negócio"
        subtitle="Produtos campeões, em crescimento, parados, curva ABC e oportunidades."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Produtos Campeões" value={String(data.champions.length)} icon={Crown} accent="orange" />
        <StatCard label="Produtos Parados" value={String(data.stalled.length)} icon={TrendingDown} />
        <StatCard label="Sem Venda (7d)" value={String(data.noSales.length)} icon={PackageX} />
        <StatCard label="Total de SKUs Ativos" value={String(data.products.length)} icon={Layers} />
      </div>

      <div className="card p-5 mb-6">
        <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Produtos Campeões (faturamento 7d)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
                <th className="py-2">Produto</th>
                <th className="py-2">Categoria</th>
                <th className="py-2">Pedidos (7d)</th>
                <th className="py-2">Faturamento (7d)</th>
                <th className="py-2">Margem</th>
              </tr>
            </thead>
            <tbody>
              {data.champions.map((p: any) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5 text-[#F5F3EF]/60">{p.category}</td>
                  <td className="py-2.5">{p.orders7}</td>
                  <td className="py-2.5">{BRL(p.revenue7)}</td>
                  <td className="py-2.5">{p.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Produtos Parados / Sem Venda</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {data.stalled.map((p: any) => (
              <div key={p.id} className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-sm">{p.name}</span>
                <span className="text-xs text-[#F5F3EF]/40">{p.orders7} pedidos (7d)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Curva ABC</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {data.abc.slice(0, 10).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-sm truncate">{p.name}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    p.abcCurve === "A"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : p.abcCurve === "B"
                      ? "bg-[#FF6B00]/15 text-[#FF6B00]"
                      : "bg-white/10 text-[#F5F3EF]/60"
                  }`}
                >
                  Curva {p.abcCurve}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium mb-2 text-[#F5F3EF]/80">Oportunidades e Alertas Estratégicos</p>
        <ul className="text-sm text-[#F5F3EF]/70 space-y-2 mt-3 list-disc list-inside">
          {data.noSales.length > 0 && (
            <li>{data.noSales.length} produtos sem venda nos últimos 7 dias — avalie reposicionamento ou desativação.</li>
          )}
          {data.champions[0] && (
            <li>"{data.champions[0].name}" é o produto campeão — considere aumentar investimento em anúncio.</li>
          )}
          <li>Produtos de Curva C representam baixo giro — revisar precificação ou mix de catálogo.</li>
        </ul>
      </div>
    </div>
  );
}
