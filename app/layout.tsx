// app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { LayoutDashboard, Receipt, Send, FileText, History, Menu, ChevronDown, Wrench } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#F8FAFC]">
        <nav className="fixed top-0 w-full bg-white border-b border-slate-200 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tighter">
              ORION <span className="text-blue-600 italic">ERP</span>
            </Link>
            
            {/* Menu Hamburguer com Hover Expand */}
            <div className="relative group h-full flex items-center cursor-pointer">
              <button className="flex items-center gap-3 px-6 py-2 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 shadow-sm cursor-pointer">
                <Menu size={18} className="text-blue-600" />
                Módulos de Gestão
                <ChevronDown size={14} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>

              {/* Lista Dropdown Expandida */}
              <div className="absolute top-full right-0 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl py-4 invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all z-[60]">
                <Link href="/recebiveis" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Receipt size={18} /></div>
                  Recebíveis
                </Link>
                
                <Link href="/envios" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Send size={18} /></div>
                  Controle de Envios
                </Link>
                
                <Link href="/fiscal" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-violet-600 hover:bg-violet-50/50 transition-colors">
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><FileText size={18} /></div>
                  Emissão Fiscal
                </Link>

                <Link href="/negociacoes" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 transition-colors">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><History size={18} /></div>
                  Negociação de Dívidas
                </Link>

                {/* Link Tático do Módulo CMMS Integrado */}
                <Link href="/cmms" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 transition-colors">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Wrench size={18} /></div>
                  CMMS
                </Link>

                <Link href="/supervisor" className="flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><LayoutDashboard size={18} /></div>
                  Supervisor IA
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}