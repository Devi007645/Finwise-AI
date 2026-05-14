import { useMemo, useState } from 'react';
import { slabTax } from '../services/taxService';
import { fmtN } from '../utils/formatters';
import { MetricCard } from './ui/MetricCard';
import { FinanceTransaction, FinancialProfile } from '../hooks/useFinanceData';

type TaxCalcProps = {
  profile: FinancialProfile | null;
  transactions: FinanceTransaction[];
};

export function TaxCalc({ profile, transactions }: TaxCalcProps) {
  const [advancePaid, setAdvancePaid] = useState(Number(profile?.advance_tax_paid || 0));
  const [quarter, setQuarter] = useState(1);

  const totals = useMemo(() => {
    const actualIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const actualExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    const actualTds = transactions.filter(t => t.type === "tds").reduce((sum, t) => sum + Number(t.amount), 0);

    const estimatedAnnualIncome = Math.max(actualIncome, Number(profile?.monthly_income_estimate || 0) * 12);
    const estimatedAnnualExpenses = Math.max(actualExpenses, Number(profile?.monthly_expense_estimate || 0) * 12);
    const estimatedTds = Math.max(actualTds, Number(profile?.tds_estimate || 0) * 12);

    return {
      annualIncome: Math.max(0, estimatedAnnualIncome - estimatedAnnualExpenses),
      grossIncome: estimatedAnnualIncome,
      expenses: estimatedAnnualExpenses,
      tdsDeducted: estimatedTds,
    };
  }, [profile, transactions]);

  const grossTax = slabTax(totals.annualIncome);
  const netTax = Math.max(0, grossTax - totals.tdsDeducted);
  const qDue = [0.15, 0.45, 0.75, 1.0];
  const cumDue = Math.round(netTax * qDue[quarter - 1]);
  const balance = Math.max(0, cumDue - advancePaid);
  const deadlines = ["15 Jun", "15 Sep", "15 Dec", "15 Mar"];

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-v-card rounded-xl p-6">
        <h2 className="text-sm font-medium text-vercel-black mb-6 tracking-tight">Advance tax calculator</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard label="Projected gross income" value={fmtN(Math.round(totals.grossIncome))} sub="From setup + records" />
          <MetricCard label="Deductible expenses" value={fmtN(Math.round(totals.expenses))} sub="Business costs recorded" colorClass="text-vercel-red" />
          <MetricCard label="Taxable income" value={fmtN(Math.round(totals.annualIncome))} sub={`${profile?.tax_regime || "new"} regime estimate`} />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-vercel-text">Advance tax already paid</span>
              <span className="font-medium tabular-nums">{fmtN(advancePaid)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={500000}
              step={1000}
              value={advancePaid}
              onChange={e => setAdvancePaid(+e.target.value)}
              className="w-full accent-vercel-black h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="text-sm text-vercel-text block mb-3">Quarter</label>
            <div className="flex gap-2">
              {[1,2,3,4].map(q => (
                <button
                  key={q}
                  onClick={() => setQuarter(q)}
                  className={`flex-1 py-1.5 rounded-md text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue ${
                    q === quarter
                      ? "bg-vercel-black text-white shadow-v-border font-medium"
                      : "bg-white text-vercel-text shadow-v-border hover:text-vercel-black hover:bg-gray-50"
                  }`}
                >
                  Q{q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total tax liability" value={fmtN(Math.round(grossTax))} sub="Estimated from records" />
        <MetricCard label="After TDS offset" value={fmtN(Math.round(netTax))} sub={`TDS ${fmtN(Math.round(totals.tdsDeducted))}`} />
        <MetricCard
          label={`Q${quarter} due by ${deadlines[quarter-1]}`}
          value={fmtN(balance)}
          sub={balance > 0 ? "Pay now to avoid interest" : "You're on track"}
          colorClass={balance > 0 ? "text-vercel-red" : "text-green-600"}
        />
      </div>

      <div className="bg-gray-50 shadow-v-border rounded-xl p-5 text-sm text-vercel-text leading-relaxed">
        <strong className="text-vercel-black font-medium">How it's calculated:</strong> projected income less expenses = taxable income <span className="tabular-nums">{fmtN(Math.round(totals.annualIncome))}</span>, then TDS is offset before quarterly advance-tax percentages are applied.
      </div>
    </div>
  );
}
