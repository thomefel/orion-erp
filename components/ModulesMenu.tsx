'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Receipt, Send, FileText, History, Menu, ChevronDown, Wrench, Bot, UserCheck, LogOut } from 'lucide-react';

export default function ModulesMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [cargo, setCargo] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getUserProfile();
    closeMenu(); // Auto-fecha o menu no mobile sempre que mudar de rota
  }, [pathname]);

  async function getUserProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('funcionarios')
        .select('nome, cargo')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data) {
        setCargo(data.cargo);
        setNome(data.nome);
      }
    }
  }

  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  // Oculta completamente o menu suspenso se o usuário estiver deslogado ou na tela de login
  if (pathname === '/login') return null;

  return (
    <div 
      className="relative h-full flex items-center cursor-pointer"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => closeMenu()}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-2 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 shadow-sm cursor-pointer"
      >
        <Menu size={18} className="text-blue-600" />
        Módulos de Gestão
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className={`absolute top-full right-0 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl py-4 transition-all duration-200 z-[60] ${
        isOpen ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 translate-y-2'
      }`}>
        
        {/* LISTAGEM MATRIZ DE VISUALIZAÇÃO POR CARGOS EXCLUSIVOS */}
        {cargo === 'administrador' && (
          <>
            <Link href="/recebiveis" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Receipt size={16} /></div>
              Recebíveis
            </Link>
            <Link href="/envios" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Send size={16} /></div>
              Controle de Envios
            </Link>
            <Link href="/fiscal" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-violet-600 hover:bg-violet-50/50 transition-colors">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><FileText size={16} /></div>
              Emissão Fiscal
            </Link>
            <Link href="/negociacoes" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 transition-colors">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><History size={16} /></div>
              Negociação de Dívidas
            </Link>
          </>
        )}

        {/* Módulo CMMS: Exibido estritamente para Administrador e ASB */}
        {['administrador', 'asb'].includes(cargo || '') && (
          <Link href="/cmms" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 transition-colors">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Wrench size={16} /></div>
            CMMS
          </Link>
        )}

        {/* Módulo Supervisor IA: Exibido estritamente para Administrador e CRC */}
        {['administrador', 'crc'].includes(cargo || '') && (
          <Link href="/supervisor" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Bot size={16} /></div>
            Supervisor IA
          </Link>
        )}

        {/* Módulo Universal de Avaliação de Desempenho (Visível por todos) */}
        <Link href="/desempenho" onClick={closeMenu} className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><UserCheck size={16} /></div>
          Desempenho
        </Link>

        {/* Detalhamento de Identificação do Perfil Operacional Conectado */}
        <div className="border-t border-slate-100 mt-4 pt-3 px-6 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-[10px] font-black text-slate-900 uppercase truncate">{nome || 'Buscando...'}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{cargo || 'Conectando'}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer" title="Sair do Sistema">
            <LogOut size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}