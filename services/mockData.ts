export interface Transaction {
  id: number;
  date: string;
  desc: string;
  amount: number;
  type: "income" | "expense" | "tds" | string;
  cat: string;
}

export const mockTx: Transaction[] = [
  { id:1, date:"2025-04-01", desc:"Upwork Project - React Dev", amount:85000, type:"income", cat:"Freelance" },
  { id:2, date:"2025-04-03", desc:"AWS Hosting", amount:-3200, type:"expense", cat:"Software" },
  { id:3, date:"2025-04-07", desc:"Notion Subscription", amount:-800, type:"expense", cat:"Software" },
  { id:4, date:"2025-04-10", desc:"Client: TDS Deducted", amount:-8500, type:"tds", cat:"TDS" },
  { id:5, date:"2025-04-12", desc:"Toptal Contract - UX", amount:62000, type:"income", cat:"Freelance" },
  { id:6, date:"2025-04-15", desc:"Figma Annual Plan", amount:-4800, type:"expense", cat:"Software" },
  { id:7, date:"2025-04-18", desc:"Fiverr Gig - Logo", amount:12000, type:"income", cat:"Design" },
  { id:8, date:"2025-04-22", desc:"Travel - Client Meeting", amount:-2100, type:"expense", cat:"Travel" },
  { id:9, date:"2025-04-25", desc:"Freelancer.com Payout", amount:34000, type:"income", cat:"Freelance" },
  { id:10, date:"2025-04-28", desc:"TDS by Toptal", amount:-6200, type:"tds", cat:"TDS" },
];
