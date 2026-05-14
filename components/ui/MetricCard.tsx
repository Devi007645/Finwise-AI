interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
}

export function MetricCard({ label, value, sub, colorClass = "text-vercel-black" }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 flex-1 min-w-0 shadow-v-card transition-shadow hover:shadow-md">
      <div className="text-xs text-vercel-text mb-1 tracking-tight">{label}</div>
      <div className={`text-2xl font-medium tracking-tight tabular-nums ${colorClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-vercel-text mt-1">{sub}</div>}
    </div>
  );
}
