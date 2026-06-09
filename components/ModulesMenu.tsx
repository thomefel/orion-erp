'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, Send, FileText, History, Menu, ChevronDown, Wrench, Bot } from 'lucide-react';

export default function ModulesMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // Fecha o menu de forma imediata (crucial para o fluxo mobile)
  const closeMenu = () => setIsOpen(false);

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

      {/* Lista Dropdown Expandida - Controlada dinamicamente pelo estado reativo */}
      <div className={`absolute top-full right-0 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl py-4 transition-all duration-200 z-[60] ${
        isOpen 
          ? 'visible opacity-100 translate-y-0' 
          : 'invisible opacity-0 translate-y-2'
      }`}>
        <Link href="/recebiveis" onClick={closeMenu} className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Receipt size={18} /></div>
          Recebíveis
        </Link>
        
        <Link href="/envios" onClick={closeMenu} className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Send size={18} /></div>
          Controle de Envios
        </Link>
        
        <Link href="/fiscal" onClick={closeMenu} className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-violet-600 hover:bg-violet-50/50 transition-colors">
          <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><FileText size={18} /></div>
          Emissão Fiscal
        </Link>

        <Link href="/negociacoes" onClick={closeMenu} className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 transition-colors">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><History size={18} /></div>
          Negociação de Dívidas
        </Link>

        <Link href="/cmms" onClick={closeMenu} className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 transition-colors">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Wrench size={18} /></div>
          CMMS
        </Link>

        <Link href="/supervisor" onClick={closeMenu} className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Bot size={18} /></div>
          Supervisor IA
        </Link>
      </div>
    </div>
  );
}