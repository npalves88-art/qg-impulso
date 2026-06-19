"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MarketplaceChart({
  chart,
  color,
}: {
  chart: { date: string; revenue: number; orders: number }[];
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chart}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,243,239,0.06)" />
        <XAxis dataKey="date" stroke="#F5F3EF55" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="#F5F3EF55" fontSize={10} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#16161a", border: "1px solid rgba(245,243,239,0.1)", borderRadius: 12 }}
          labelStyle={{ color: "#F5F3EF" }}
        />
        <Line type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
