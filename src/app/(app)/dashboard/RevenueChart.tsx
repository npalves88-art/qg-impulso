"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function RevenueChart({
  chart,
}: {
  chart: { date: string; revenue: number; orders: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chart}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#FF6B00" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,243,239,0.06)" />
        <XAxis dataKey="date" stroke="#F5F3EF55" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#F5F3EF55" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#16161a", border: "1px solid rgba(245,243,239,0.1)", borderRadius: 12 }}
          labelStyle={{ color: "#F5F3EF" }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#FF6B00" fill="url(#revGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
