"use client";

import { useState } from "react";
import RegistroDoDiaForm from "./RegistroDoDiaForm";
import RelatorioView from "./RelatorioView";
import DashboardView from "./DashboardView";

type Tab = "registro" | "relatorio" | "dashboard";

export default function OwnRadarTabs({
  dashboardData,
  clients = [],
}: {
  dashboardData: any;
  clients?: { id: number; razao_social: string }[];
}) {
  const [tab, setTab] = useState<Tab>("registro");
  const [lastReport, setLastReport] = useState<any | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: "registro", label: "01 · Registro do Dia" },
    { key: "relatorio", label: "02 · Relatório" },
    { key: "dashboard", label: "03 · Dashboard" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              tab === t.key ? "bg-[#FF6B00] text-[#0F0F10] font-medium" : "bg-white/5 text-[#F5F3EF]/70 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "registro" && (
        <RegistroDoDiaForm
          clients={clients}
          onSubmitted={(report) => {
            setLastReport(report);
            setTab("relatorio");
          }}
        />
      )}
      {tab === "relatorio" && <RelatorioView report={lastReport} />}
      {tab === "dashboard" && <DashboardView data={dashboardData} />}
    </div>
  );
}
