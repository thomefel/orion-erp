// app/page.tsx
import Link from 'next/link';
import { Receipt, Send, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto text-center mt-20">
      <h1 className="text-5xl font-black text-slate-900 mb-6">
        Bem-vindo ao <span className="text-blue-600">Orion</span>
      </h1>
      <p className="text-xl text-slate-500 mb-12">Selecione o módulo que deseja operar hoje na AC Odontologia.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/recebiveis" className="group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all text-left">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Receipt size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Recebíveis</h2>
          <p className="text-slate-500 mb-6">Importe as planilhas do Simples Dental e prepare a régua de cobrança.</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            Acessar Módulo <ArrowRight size={18} />
          </div>
        </Link>

        <Link href="/envios" className="group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 transition-all text-left">
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <Send size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Controle de Envios</h2>
          <p className="text-slate-500 mb-6">Visualize a fila de mensagens e dispare os lembretes via Z-API.</p>
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            Gerenciar Disparos <ArrowRight size={18} />
          </div>
        </Link>
      </div>
    </div>
  );
}