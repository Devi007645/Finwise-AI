export const fmt = (n: number): string => "₹" + Math.abs(n).toLocaleString("en-IN");
export const fmtN = (n: number): string => "₹" + n.toLocaleString("en-IN");
