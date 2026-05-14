interface BadgeProps {
  type: "income" | "expense" | "tds" | string;
}

export function Badge({ type }: BadgeProps) {
  const styles: Record<string, { bg: string, text: string, label: string }> = {
    income: { bg: "bg-green-50", text: "text-green-700", label: "Income" },
    expense: { bg: "bg-red-50", text: "text-red-700", label: "Expense" },
    tds: { bg: "bg-orange-50", text: "text-orange-700", label: "TDS" },
  };
  const s = styles[type] || styles.income;
  return (
    <span className={`${s.bg} ${s.text} text-[11px] px-2 py-0.5 rounded-full font-medium shadow-v-border inline-flex items-center`}>
      {s.label}
    </span>
  );
}
