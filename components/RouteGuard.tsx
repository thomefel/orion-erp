'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Loader2, ShieldX, Lock, Home, LogOut } from 'lucide-react';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cargo, setCargo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    validarPermissoesRota();
  }, [pathname]);

  async function validarPermissoesRota() {
    setLoading(true);
    
    // Ignora checagem explícita se estiver na tela pública de login
    if (pathname === '/login') {
      setAuthorized(true);
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setAuthorized(false);
      setLoading(false);
      router.push('/login');
      return;
    }

    // Busca o cargo real do funcionário logado direto na tabela pública blindada
    const { data } = await supabase
      .from('funcionarios')
      .select('cargo')
      .eq('id', session.user.id)
      .maybeSingle();

    const userCargo = data?.cargo || null;
    setCargo(userCargo);

    // MATRIX OPERACIONAL DE SEGURANÇA JURÍDICA E CONTÁBIL (RBAC)
    let isAllowed = false;

    if (userCargo === 'administrador') {
      // 1. Administrador possui passe livre irrestrito em todo o ERP
      isAllowed = true;
    } else if (userCargo === 'asb') {
      // 2. Auxiliar de Saúde Bucal: Apenas Home, Desempenho e módulo de engenharia CMMS
      isAllowed = pathname === '/' || pathname.startsWith('/desempenho') || pathname.startsWith('/cmms');
    } else if (userCargo === 'crc') {
      // 3. Operador CRC: Apenas Home, Desempenho e o painel do Supervisor da Mariana IA
      isAllowed = pathname === '/' || pathname.startsWith('/desempenho') || pathname.startsWith('/supervisor');
    } else if (userCargo === 'recepcionista') {
      // 4. Recepcionista: Apenas página inicial e prontuário de leitura do próprio desempenho
      isAllowed = pathname === '/' || pathname.startsWith('/desempenho');
    }

    // Rota explícita de escape sempre autorizada
    if (pathname === '/acesso-negado') isAllowed = true;

    setAuthorized(isAllowed);
    setLoading(false);
  }

  const handleForceLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] animate-pulse">
          Criptografando Túnel de Acesso Orion...
        </p>
      </div>
    );
  }

  // INTERCEPTAÇÃO OPERACIONAL: Renderiza a UI de Bloqueio se o usuário for um intruso na rota
  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 flex flex-col items-center">
          <div className="p-5 bg-red-50 text-red-600 rounded-3xl mb-6 shadow-inner animate-bounce">
            <ShieldX size={44} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
            Acesso Restrito
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">
            Código de Erro: 403 Forbidden
          </p>
          <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
            Seu cargo operacional (<span className="text-red-500 font-black uppercase">{cargo}</span>) não possui privilégios de segurança para auditar ou modificar a rota <span className="font-mono bg-slate-50 border px-1.5 py-0.5 rounded text-xs text-slate-700 font-bold">{pathname}</span>.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => router.push('/')} 
              className="py-3.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home size={12} /> Painel Inicial
            </button>
            <button 
              onClick={handleForceLogout} 
              className="py-3.5 bg-white border border-slate-200 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={12} /> Trocar Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}