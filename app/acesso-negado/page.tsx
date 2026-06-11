'use client';

import { useRouter } from 'next/navigation';
import { ShieldX, Home } from 'lucide-react';

export default function AcessoNegadoPageStatic() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 flex flex-col items-center">
        <div className="p-5 bg-red-50 text-red-600 rounded-3xl mb-6 shadow-inner">
          <ShieldX size={44} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
          Acesso Negado
        </h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">
          Erro 403 • Restrição de Segurança
        </p>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
          Esta rota operacional é criptografada e de acesso restrito a perfis autorizados da diretoria. Suas tentativas de navegação foram registradas para fins de auditoria interna.
        </p>
        <button 
          onClick={() => router.push('/')} 
          className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Home size={12} /> Voltar para a Central Segura
        </button>
      </div>
    </div>
  );
}