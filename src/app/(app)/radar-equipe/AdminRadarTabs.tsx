"use client";

import { useState } from "react";
import TeamReportsView from "./TeamReportsView";
import DashboardView from "./DashboardView";

type Tab = "relatorios" | "dashboard";

export default function AdminRadarTabs({ teamReports, teamDashboard }: { teamReports: any[]; teamDashboard: any }) {
  const [tab, setTab] = useState<Tab>("relatorios");

  const tabs: { key: Tab; label: string }[] = [
    { key: "relatorios", label: "Relatórios da Equipe" },
    { key: "dashboard", label: "Dashboard da Equipe" },
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

      {tab === "relatorios" && <TeamReportsView reports={teamReports} />}
      {tab === "dashboard" && <DashboardView data={teamDashboard} />}
    </div>
  );
}
