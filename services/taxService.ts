export const slabTax = (income: number): number => {
  if (income <= 300000) return 0;
  if (income <= 600000) return (income - 300000) * 0.05;
  if (income <= 900000) return 15000 + (income - 600000) * 0.1;
  if (income <= 1200000) return 45000 + (income - 900000) * 0.15;
  if (income <= 1500000) return 90000 + (income - 1200000) * 0.2;
  return 150000 + (income - 1500000) * 0.3;
};
