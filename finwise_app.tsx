import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { TaxCalc } from "./components/TaxCalc";
import { Invoices } from "./components/Invoices";
import { AIAdvisor } from "./components/AIAdvisor";
import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { SignUp } from "./components/SignUp";
import { Onboarding } from "./components/Onboarding";
import { useAuth } from "./hooks/useAuth";
import { useFinanceData } from "./hooks/useFinanceData";
import { supabase } from "./lib/supabase";

type PageState = 'landing' | 'login' | 'signup' | 'app';

const TABS = ["Dashboard", "Tax Calculator", "Invoices", "AI Advisor"];

export default function Finwise() {
  const { session, loading } = useAuth();
  const finance = useFinanceData(session);
  const [page, setPage] = useState<PageState>('landing');
  const [tab, setTab] = useState(0);

  // Automatically navigate to app if logged in, or landing if logged out (unless they are on login/signup explicitly)
  useEffect(() => {
    if (session) {
      setPage('app');
    } else if (page === 'app') {
      setPage('landing');
    }
  }, [session, page]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPage('landing');
  };
  
  if (loading || (session && finance.loading)) return <div className="min-h-screen flex items-center justify-center text-vercel-text text-sm">Loading...</div>;

  if (page === 'landing' && !session) return <Landing onNavigate={setPage} />;
  if (page === 'login' && !session) return <Login onNavigate={setPage} />;
  if (page === 'signup' && !session) return <SignUp onNavigate={setPage} />;

  const fullName = session?.user?.user_metadata?.full_name || "User";
  const nameParts = fullName.trim().split(" ");
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : fullName.substring(0, 2).toUpperCase();

  if (session && !finance.profile?.onboarding_completed) {
    return <Onboarding fullName={fullName} onComplete={finance.completeOnboarding} />;
  }

  const panels = [
    <Dashboard profile={finance.profile} transactions={finance.transactions} />,
    <TaxCalc profile={finance.profile} transactions={finance.transactions} />,
    <Invoices
      invoices={finance.invoices}
      transactions={finance.transactions}
      addInvoice={finance.addInvoice}
      addTransaction={finance.addTransaction}
    />,
    <AIAdvisor
      profile={finance.profile}
      transactions={finance.transactions}
      invoices={finance.invoices}
    />,
  ];

  return (
    <div className="font-sans max-w-3xl mx-auto p-6 md:p-12 text-vercel-black transition-opacity duration-300">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-vercel-black text-white flex items-center justify-center font-semibold text-base shadow-v-border tracking-widest">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-balance">Finwise</h1>
            <p className="text-sm text-vercel-text">AI Financial Co-Pilot · {fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">

          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-vercel-text hover:text-vercel-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue px-2 py-1"
          >
            Log out
          </button>
        </div>
      </div>

      <nav className="flex gap-2 mb-8 border-b border-gray-100 pb-2 overflow-x-auto">
        {TABS.map((t, i) => (
          <button 
            key={t} 
            onClick={() => setTab(i)} 
            className={`px-3 py-1.5 rounded-md text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue whitespace-nowrap ${
              tab === i 
                ? "bg-vercel-black text-white font-medium shadow-v-border" 
                : "text-vercel-text hover:text-vercel-black hover:bg-gray-50"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="transition-opacity duration-300">
        {panels[tab]}
      </main>
    </div>
  );
}
