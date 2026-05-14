import { useState, useMemo } from 'react';
import { fmt, fmtN } from '../utils/formatters';
import { FinanceTransaction, FinancialProfile } from '../hooks/useFinanceData';
import { Badge } from './ui/Badge';
import { MetricCard } from './ui/MetricCard';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type DashboardProps = {
  profile: FinancialProfile | null;
  transactions: FinanceTransaction[];
};

function getFY(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown";
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 is Jan, 3 is Apr
  if (month >= 3) {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(-2)}`;
  }
}

const MONTHS_FY_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
];

function getMonthShort(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString('default', { month: 'short' });
}

export function Dashboard({ profile, transactions }: DashboardProps) {
  // Determine available FYs
  const availableFYs = useMemo(() => {
    const fys = new Set<string>();
    transactions.forEach(t => {
      if (t.transaction_date) {
        fys.add(getFY(t.transaction_date));
      }
    });
    return Array.from(fys).sort().reverse();
  }, [transactions]);

  const [selectedFY, setSelectedFY] = useState<string>("All Time");

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (selectedFY === "All Time") return transactions;
    return transactions.filter(t => t.transaction_date && getFY(t.transaction_date) === selectedFY);
  }, [transactions, selectedFY]);

  const incomeRecords = filteredTransactions.filter(t => t.type === "income");
  const expenseRecords = filteredTransactions.filter(t => t.type === "expense");
  const tdsRecords = filteredTransactions.filter(t => t.type === "tds");

  const hasRealData = filteredTransactions.length > 0;

  const income = incomeRecords.reduce((a, t) => a + Number(t.amount), 0) || (selectedFY === "All Time" ? Number(profile?.monthly_income_estimate || 0) : 0);
  const expense = expenseRecords.reduce((a, t) => a + Number(t.amount), 0) || (selectedFY === "All Time" ? Number(profile?.monthly_expense_estimate || 0) : 0);
  const tds = tdsRecords.reduce((a, t) => a + Number(t.amount), 0) || (selectedFY === "All Time" ? Number(profile?.tds_estimate || 0) : 0);
  const net = income - expense - tds;
  const barMax = Math.max(income, expense, tds, net, 1);

  const summaryBars = [
    { label: "Income", value: income, color: "bg-vercel-black" },
    { label: "Expenses", value: expense, color: "bg-vercel-red" },
    { label: "TDS", value: tds, color: "bg-orange-500" },
    { label: "Net", value: net, color: "bg-vercel-blue" },
  ];

  // Prepare Chart Data
  const chartData = useMemo(() => {
    // If no real data, fake data based on profile for visualization
    if (!hasRealData && selectedFY === "All Time") {
      return {
        labels: ["Estimated (Monthly)"],
        datasets: [
          {
            label: 'Income',
            data: [Number(profile?.monthly_income_estimate || 0)],
            backgroundColor: '#000000',
            borderRadius: 4,
          },
          {
            label: 'Expense',
            data: [Number(profile?.monthly_expense_estimate || 0)],
            backgroundColor: '#EF4444',
            borderRadius: 4,
          },
          {
            label: 'TDS',
            data: [Number(profile?.tds_estimate || 0)],
            backgroundColor: '#F97316',
            borderRadius: 4,
          }
        ]
      };
    }

    const monthData: Record<string, { income: number; expense: number; tds: number }> = {};
    let labelsToUse = MONTHS_FY_ORDER;
    
    if (selectedFY === "All Time") {
        const uniqueMonths = new Set<string>();
        filteredTransactions.forEach(t => {
            if(t.transaction_date) {
                const d = new Date(t.transaction_date);
                if(!isNaN(d.getTime())) {
                    uniqueMonths.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`);
                }
            }
        });
        labelsToUse = Array.from(uniqueMonths).sort();
        labelsToUse.forEach(l => {
            if(!monthData[l]) monthData[l] = { income: 0, expense: 0, tds: 0 };
        });
    } else {
        MONTHS_FY_ORDER.forEach(m => monthData[m] = { income: 0, expense: 0, tds: 0 });
    }

    filteredTransactions.forEach(t => {
      if (t.transaction_date) {
        let key = "";
        if (selectedFY === "All Time") {
            const d = new Date(t.transaction_date);
            if(!isNaN(d.getTime())) {
                key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
            }
        } else {
            key = getMonthShort(t.transaction_date);
        }
        
        if (monthData[key]) {
          if (t.type === "income") monthData[key].income += Number(t.amount);
          if (t.type === "expense") monthData[key].expense += Number(t.amount);
          if (t.type === "tds") monthData[key].tds += Number(t.amount);
        }
      }
    });

    return {
      labels: labelsToUse.map(l => {
          if(selectedFY === "All Time") {
              const [y, m] = l.split('-');
              const d = new Date(parseInt(y), parseInt(m)-1);
              return `${d.toLocaleString('default', { month: 'short' })} '${y.slice(-2)}`;
          }
          return l;
      }),
      datasets: [
        {
          label: 'Income',
          data: labelsToUse.map(m => monthData[m]?.income || 0),
          backgroundColor: '#000000',
          borderRadius: 4,
          maxBarThickness: 40,
        },
        {
          label: 'Expense',
          data: labelsToUse.map(m => monthData[m]?.expense || 0),
          backgroundColor: '#EF4444',
          borderRadius: 4,
          maxBarThickness: 40,
        },
        {
          label: 'TDS',
          data: labelsToUse.map(m => monthData[m]?.tds || 0),
          backgroundColor: '#F97316',
          borderRadius: 4,
          maxBarThickness: 40,
        }
      ]
    };
  }, [filteredTransactions, hasRealData, profile, selectedFY]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: {
                family: 'Inter, sans-serif',
                size: 12
            }
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#000000',
        bodyColor: '#666666',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: {
            family: 'Inter, sans-serif',
            size: 14,
            weight: 600 as const,
        },
        bodyFont: {
            family: 'Inter, sans-serif',
            size: 13,
        },
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
            font: {
                family: 'Inter, sans-serif'
            }
        }
      },
      y: {
        border: {
            display: false
        },
        grid: {
          color: '#F3F4F6',
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif'
          },
          callback: function(value: any) {
             if(value >= 100000) {
                 return '₹' + (value/100000).toFixed(1) + 'L';
             }
             if(value >= 1000) {
                 return '₹' + (value/1000).toFixed(1) + 'K';
             }
             return '₹' + value;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h2 className="text-xl font-medium tracking-tight text-vercel-black">Financial Overview</h2>
        
        <div className="flex items-center gap-3">
          <label className="text-sm text-vercel-text font-medium">Period:</label>
          <div className="relative">
              <select 
                value={selectedFY} 
                onChange={(e) => setSelectedFY(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-vercel-black text-sm rounded-lg focus:ring-2 focus:ring-vercel-blue focus:border-transparent block w-full pl-3 pr-8 py-2 shadow-sm transition-shadow cursor-pointer hover:border-gray-300"
              >
                <option value="All Time">All Time</option>
                {availableFYs.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Income" value={fmtN(income)} sub={selectedFY === "All Time" && !hasRealData ? "Estimated" : `${incomeRecords.length} records`} />
        <MetricCard label="Expenses" value={fmtN(expense)} sub={selectedFY === "All Time" && !hasRealData ? "Estimated" : `${expenseRecords.length} records`} colorClass="text-vercel-red" />
        <MetricCard label="TDS Deducted" value={fmtN(tds)} sub={selectedFY === "All Time" && !hasRealData ? "Estimated" : `${tdsRecords.length} records`} colorClass="text-orange-600" />
        <MetricCard label="Net Earnings" value={fmtN(net)} sub="After TDS and expenses" colorClass="text-vercel-blue" />
      </div>

      <div className="bg-white shadow-v-card rounded-xl p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-medium text-vercel-black tracking-tight">Cashflow Trends</h2>
            <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded shadow-sm border border-gray-100 font-medium tracking-wide">Interactive Chart</span>
        </div>
        
        <div className="h-[300px] w-full">
            <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white shadow-v-card rounded-xl p-6 border border-gray-100 flex flex-col">
            <h2 className="text-sm font-medium mb-6 text-vercel-black tracking-tight">Summary ({selectedFY})</h2>
            <div className="space-y-5 flex-grow">
              {summaryBars.map(b => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-vercel-text">{b.label}</span>
                    <span className="font-medium tabular-nums">{fmtN(b.value)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${b.color} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${Math.min(100, (Math.max(0, b.value) / barMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white shadow-v-card rounded-xl p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-vercel-black tracking-tight">Transactions</h2>
                <span className="text-xs text-vercel-text">{filteredTransactions.length} items</span>
            </div>
            
            {filteredTransactions.length === 0 ? (
              <div className="text-sm text-vercel-text bg-gray-50 rounded-lg p-8 border border-dashed border-gray-200 text-center flex flex-col items-center justify-center h-[200px]">
                <svg className="w-8 h-8 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p>No transactions found for {selectedFY}.</p>
                <p className="mt-1">Add invoices or manual entries to populate this view.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTransactions.slice(0, 15).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-md transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-sm font-medium truncate text-gray-900">{t.description}</div>
                      <div className="text-xs text-vercel-text mt-1 tabular-nums flex items-center gap-2">
                          <span>{t.transaction_date}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">{t.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <Badge type={t.type} />
                      <span className={`text-sm font-medium tabular-nums ${t.type === "income" ? "text-vercel-black" : "text-vercel-text"}`}>
                        {t.type === "income" ? "+" : "-"}{fmt(Number(t.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
