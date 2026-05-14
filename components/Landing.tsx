interface LandingProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

export function Landing({ onNavigate }: LandingProps) {
  return (
    <div className="min-h-screen bg-white text-vercel-black font-sans selection:bg-gray-200">
      <nav className="flex items-center justify-between p-6 md:px-12 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vercel-black text-white flex items-center justify-center font-bold text-sm shadow-v-border">F</div>
          <span className="font-semibold tracking-tight">Finwise</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('login')}
            className="text-sm font-medium text-vercel-text hover:text-vercel-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue rounded-md px-2 py-1"
          >
            Log in
          </button>
          <button 
            onClick={() => onNavigate('signup')}
            className="text-sm font-medium bg-vercel-black text-white px-4 py-2 rounded-md shadow-v-border hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue"
          >
            Sign up
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 md:px-12 pt-24 pb-16 text-center animate-in fade-in duration-700">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 shadow-v-border text-xs font-medium text-vercel-text mb-8">
          <span className="w-2 h-2 rounded-full bg-vercel-develop"></span>
          Now with AI Advisory
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-balance leading-tight mb-6">
          Infrastructure for your freelance finances.
        </h1>
        
        <p className="text-lg md:text-xl text-vercel-text max-w-2xl mx-auto text-balance leading-relaxed tracking-tight mb-10">
          Finwise automatically calculates your taxes, tracks your invoices, and provides AI-driven financial advisory. Built for modern freelancers.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
          <button 
            onClick={() => onNavigate('signup')}
            className="w-full sm:w-auto text-base font-medium bg-vercel-black text-white px-8 py-3 rounded-lg shadow-v-border hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue"
          >
            Start for free
          </button>
          <button 
            className="w-full sm:w-auto text-base font-medium bg-white text-vercel-black px-8 py-3 rounded-lg shadow-v-border hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue"
          >
            Book a demo
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          {[
            { title: "AI Co-Pilot", desc: "Ask questions about GST, TDS, and advance taxes. Get instant, context-aware answers powered by Gemini." },
            { title: "Tax Calculator", desc: "Real-time estimations for advance tax deadlines under the new regime. Never miss a payment." },
            { title: "Invoice Engine", desc: "Track paid, drafted, and overdue invoices in a clean, unified dashboard." }
          ].map(f => (
            <div key={f.title} className="bg-white p-6 rounded-xl shadow-v-card transition-shadow hover:shadow-md">
              <h3 className="font-semibold text-vercel-black tracking-tight mb-2">{f.title}</h3>
              <p className="text-sm text-vercel-text leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
