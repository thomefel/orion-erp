'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { UserCheck, Loader2, ArrowUpRight, ShieldAlert } from 'lucide-react';

export default function DesempenhoMestrePage() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfilLogado, setPerfilLogado] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Busca perfil operacional
    const { data: perfil } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!perfil) {
      alert('Erro crítico: Perfil de funcionário não localizado.');
      setLoading(false);
      return;
    }

    setPerfilLogado(perfil);

    if (perfil.cargo === 'administrador') {
      // Carrega os colaboradores clínicos
      const { data: lista } = await supabase
        .from('funcionarios')
        .select('*')
        .neq('cargo', 'administrador')
        .order('nome');
      setFuncionarios(lista || []);
      setLoading(false);
    } else {
      // Redireciona o colaborador direto para o seu próprio prontuário em modo leitura
      router.push(`/desempenho/${perfil.id}`);
    }
  }

  if (loading) {
    return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] tracking-widest uppercase">Carregando painel de metas corporativas...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="mb-12 text-left">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2 uppercase italic text-left">
          Orion <span className="text-blue-600 not-italic">Desempenho</span>
        </h1>
        <p className="text-slate-500 font-medium text-left">Configurações de Metas, Apontamentos e Feedbacks • AC Odontologia</p>
      </header>

      <section className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-2xl overflow-hidden min-h-[300px]">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
          <UserCheck size={14} className="text-blue-600" />Colaboradores
        </h3>

        {funcionarios.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum funcionário cadastrado no sistema.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funcionarios.map((f) => (
              <div key={f.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl flex flex-col justify-between items-start hover:border-blue-200 hover:bg-white transition-all group shadow-sm">
                <div className="text-left w-full truncate">
                  <h4 className="font-black text-sm text-slate-800 uppercase truncate">{f.nome}</h4>
                </div>
                
                <button 
                  onClick={() => router.push(`/desempenho/${f.id}`)}
                  className="mt-6 w-full py-3 bg-white border border-slate-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Avaliar Desempenho <ArrowUpRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}