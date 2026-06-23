"use client";

import { useState } from "react";
import RelatorioView from "./RelatorioView";

type TeamReport = {
  date: string;
  employeeName: string;
  cliente: string | null;
  skus: any[];
  pendencias: any[];
  planejamento: any[];
  gargalos: string[];
  gargalosDetalhamento: string | null;
  selfScore: number | null;
  analysis: string | null;
};

export default function TeamReportsView({ reports }: { reports: TeamReport[] }) {
  const [selected, setSelected] = useState<TeamReport | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-[#F5F3EF]/60 hover:text-[#F5F3EF] transition"
        >
          ← Voltar para a lista
        </button>
        <RelatorioView report={selected} />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-[#F5F3EF]/50">Nenhum relatório enviado pela equipe ainda</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[#F5F3EF]/40 text-xs uppercase">
              <th className="py-2">Data</th>
              <th className="py-2">Colaborador</th>
              <th className="py-2">Cliente</th>
              <th className="py-2">SKUs</th>
              <th className="py-2">Nota</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr
                key={`${r.employeeName}-${r.date}-${i}`}
                onClick={() => setSelected(r)}
                className="border-t border-white/5 cursor-pointer hover:bg-white/5 transition"
              >
                <td className="py-2.5">{r.date}</td>
                <td className="py-2.5 font-medium text-[#FF6B00] hover:underline">{r.employeeName}</td>
                <td className="py-2.5 text-[#F5F3EF]/60">{r.cliente || "-"}</td>
                <td className="py-2.5">{r.skus.length}</td>
                <td className="py-2.5">
                  <span className="px-2 py-1 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] text-xs font-medium">
                    {r.selfScore ?? "-"}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(r);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                  >
                    Ver relatório
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
