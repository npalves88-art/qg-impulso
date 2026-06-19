import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: "orange" | "petrol" | "neutral";
}) {
  const accentColor =
    accent === "orange" ? "#FF6B00" : accent === "petrol" ? "#1E6F86" : "#F5F3EF";

  return (
    <div className="card p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-[#F5F3EF]/45">{label}</p>
        {Icon && <Icon size={16} style={{ color: accentColor }} />}
      </div>
      <p className="text-2xl font-semibold text-[#F5F3EF] truncate">{value}</p>
      {trend && (
        <p className={`text-xs ${trendUp ? "text-emerald-400" : "text-red-400"}`}>{trend}</p>
      )}
    </div>
  );
}
