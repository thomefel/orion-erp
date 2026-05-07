// app/page.tsx
import Link from 'next/link';
import { Receipt, Send, ArrowRight, FileText } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto text-center mt-20">
      <h1 className="text-5xl font-black text-slate-900 mb-6">
        Bem-vindo ao <span className="text-blue-600">Orion</span>
      </h1>
      <p className="text-xl text-slate-500 mb-12">Selecione o módulo que deseja operar hoje na AC Odontologia.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link href="/recebiveis" className="group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all text-left flex flex-col">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Receipt size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Recebíveis</h2>
          <p className="text-slate-500 mb-6 flex-grow">Importe as planilhas do Simples Dental e prepare a régua de cobrança.</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            Acessar Módulo <ArrowRight size={18} />
          </div>
        </Link>

        <Link href="/envios" className="group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 transition-all text-left flex flex-col">
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <Send size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Controle de Envios</h2>
          <p className="text-slate-500 mb-6 flex-grow">Visualize a fila de mensagens e dispare os lembretes via Evolution-API.</p>
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            Gerenciar Disparos <ArrowRight size={18} />
          </div>
        </Link>

        {/* Novo Card: Módulo Fiscal */}
        <Link href="/fiscal" className="group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-violet-500 transition-all text-left flex flex-col">
          <div className="bg-violet-50 text-violet-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-violet-600 group-hover:text-white transition-all">
            <FileText size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Emissão Fiscal</h2>
          <p className="text-slate-500 mb-6 flex-grow">Valide planilhas e gerencie a fila de emissão automatizada de NFS-e.</p>
          <div className="flex items-center gap-2 text-violet-600 font-bold">
            Acessar Módulo <ArrowRight size={18} />
          </div>
        </Link>
      </div>
    </div>
  );
}