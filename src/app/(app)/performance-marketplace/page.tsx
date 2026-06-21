import { getSession } from "@/lib/auth";
import { getMarketplacePerformance } from "@/lib/queries";
import { autoSyncMercadoLivreIfStale } from "@/lib/integrations/auto-sync";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import MarketplaceChart from "./MarketplaceChart";
import { Eye, MousePointerClick, ShoppingBag, DollarSign } from "lucide-react";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dynamic = "force-dynamic";

export default async function PerformanceMarketplacePage() {
  const session = await getSession();
  await autoSyncMercadoLivreIfStale(session!.companyId);
  const marketplaces = await getMarketplacePerformance(session!.companyId);

  return (
    <div>
      <PageHeader
        title="Performance Marketplace"
        subtitle="Mercado Livre e Shopee — impressões, cliques, conversão e ranking de anúncios."
      />

      {marketplaces.map((mp: any) => (
        <div key={mp.id} className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mp.color }} />
            <h2 className="text-lg font-semibold">{mp.name}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Impressões (30d)" value={mp.totals.impressions.toLocaleString("pt-BR")} icon={Eye} />
            <StatCard label="CTR" value={`${mp.totals.ctr}%`} icon={MousePointerClick} accent="orange" />
            <StatCard label="Pedidos (30d)" value={String(mp.totals.orders)} icon={ShoppingBag} />
            <StatCard label="Faturamento (30d)" value={BRL(mp.totals.revenue)} icon={DollarSign} accent="petrol" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-1">
              <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Faturamento — 30 dias</p>
              <MarketplaceChart chart={mp.chart} color={mp.color} />
            </div>

            <div className="card p-5">
              <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Top Anúncios</p>
              <div className="space-y-3 max-h-[260px] overflow-y-auto scrollbar-thin">
                {mp.topAds.map((a: any) => (
                  <div key={a.id} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-sm truncate pr-2">{a.title}</span>
                    <span className="text-xs text-[#F5F3EF]/50">{BRL(a.revenue || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-sm font-medium mb-4 text-[#F5F3EF]/80">Anúncios com Problema</p>
              <div className="space-y-3 max-h-[260px] overflow-y-auto scrollbar-thin">
                {mp.worstAds.map((a: any) => (
                  <div key={a.id} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-sm truncate pr-2">{a.title}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-400">
                      Saúde {a.health_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
