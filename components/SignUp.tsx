import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SignUpProps {
  onNavigate: (page: 'landing' | 'login' | 'app') => void;
}

export function SignUp({ onNavigate }: SignUpProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // 1. Sign up user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Insert into profiles (Optional if using triggers, but doing explicitly here)
    if (data.user) {
      await supabase.from('profiles').insert([
        { id: data.user.id, name }
      ]);
    }

    await supabase.auth.signOut();
    setLoading(false);
    onNavigate('login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans">
      <div 
        onClick={() => onNavigate('landing')}
        className="w-10 h-10 rounded-full bg-vercel-black text-white flex items-center justify-center font-bold text-lg shadow-v-border mb-8 cursor-pointer hover:scale-105 transition-transform"
      >
        F
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-v-card w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-semibold tracking-tight text-center mb-2">Create your account</h2>
        <p className="text-sm text-vercel-text text-center mb-8">Start managing your freelance finances today.</p>
        
        {error && (
          <div className="bg-red-50 text-vercel-red text-sm p-3 rounded-md mb-6 shadow-v-border">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-vercel-black mb-1.5">Full Name</label>
            <input 
              type="text" 
              required
              placeholder="Arjun Sharma…"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus transition-shadow placeholder:text-gray-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-vercel-black mb-1.5">Email</label>
            <input 
              type="email" 
              required
              placeholder="you@example.com…"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus transition-shadow placeholder:text-gray-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-vercel-black mb-1.5">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full text-base md:text-sm px-3 py-2 rounded-md shadow-v-border outline-none focus:shadow-v-focus transition-shadow placeholder:text-gray-400 bg-white"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !name || !email || !password}
            className="w-full bg-vercel-black text-white py-2.5 rounded-md text-sm font-medium shadow-v-border hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue mt-2 flex justify-center items-center h-[42px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-vercel-text mt-6">
          Already have an account?{' '}
          <button onClick={() => onNavigate('login')} className="text-vercel-black font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vercel-blue rounded-sm">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
