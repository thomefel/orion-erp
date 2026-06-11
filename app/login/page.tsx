'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Loader2, ShieldAlert, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Traduz o Login simples informado para a identidade de e-mail interna do banco
    const emailMapeado = `${username.trim().toLowerCase()}@orion.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailMapeado,
      password: password, // Mantém case_sensitive estrito para assegurar força da chave
    });

    if (error) {
      setErrorMsg('Credenciais inválidas. Verifique seu login e senha operacionais.');
      setLoading(false);
    } else {
      router.refresh();
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">
          ORION <span className="text-blue-600 not-italic">ERP</span>
        </h1>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">
          Realize o login
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-left text-xs font-bold text-red-600">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Login
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="recepcionista"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              required 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Senha
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-100"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
            Autenticar na Central
          </button>
        </form>
      </div>
    </div>
  );
}