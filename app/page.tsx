// app/page.tsx
import Link from 'next/link';
import { 
  Receipt, 
  Send, 
  ArrowRight, 
  FileText, 
  History, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  Wrench,
  Bot // Injetado para a identidade visual do Supervisor IA
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Intro Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-7xl font-black text-slate-900 mb-6 tracking-tighter leading-tight italic uppercase">
          ORION <span className="text-blue-600 not-italic">AC ODONTOLOGIA</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed uppercase tracking-tighter">
          Ferramentas de controle financeiro e contábil
        </p>
      </section>

      {/* Seção 1: Recebíveis */}
      <Link href="/recebiveis" className="group block w-full bg-white border-y border-slate-100 hover:bg-blue-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[45vh] flex items-center justify-between">
          <div className="max-w-xl text-left">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-blue-600 transition-colors">Recebíveis</h2>
            <p className="text-lg font-bold text-slate-400 mt-4 uppercase tracking-tight">FLUXO DE CAIXA E DEVEDORES</p>
            <p className="text-slate-500 mt-6 leading-relaxed">
              Importação inteligente de planilhas do Simples Dental para alimentação do Orion Cloud. Prepare e valide sua base de dados antes de iniciar os disparos de mensagens automatizadas no whatsapp.
            </p>
          </div>
          <div className="p-12 bg-slate-50 rounded-[48px] group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-3 shadow-2xl shadow-blue-100">
            <Receipt size={64} />
          </div>
        </div>
      </Link>

      {/* Seção 2: Controle de Envios */}
      <Link href="/envios" className="group block w-full bg-slate-50/50 border-b border-slate-100 hover:bg-emerald-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[45vh] flex items-center justify-between flex-row-reverse">
          <div className="max-w-xl text-left">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-emerald-600 transition-colors">Controle de Envios</h2>
            <p className="text-lg font-bold text-slate-400 mt-4 uppercase tracking-tight">DISPARO DE MENSAGENS AUTOMATIZADO</p>
            <p className="text-slate-500 mt-6 leading-relaxed">
              Gestão da fila de disparos via Evolution-API. Visualize a régua de cobrança automática (D-2 a D+15) e execute disparos manuais ou em piloto automático.
            </p>
          </div>
          <div className="p-12 bg-white rounded-[48px] group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 group-hover:-rotate-3 shadow-2xl shadow-emerald-100">
            <Send size={64} />
          </div>
        </div>
      </Link>

      {/* Seção 3: Emissão Fiscal */}
      <Link href="/fiscal" className="group block w-full bg-slate-50/50 border-b border-slate-100 hover:bg-violet-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[45vh] flex items-center justify-between">
          <div className="max-w-xl text-left">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-violet-600 transition-colors">Emissão Fiscal</h2>
            <p className="text-lg font-bold text-slate-400 mt-4 uppercase tracking-tight text-left">Automação de NFS-e</p>
            <p className="text-slate-500 mt-6 leading-relaxed text-left">
              Validação de registros fiscais e fila de emissão automatizada. Garanta a conformidade tributária da clínica com processos de envio em lote e monitoramento de status.
            </p>
          </div>
          <div className="p-12 bg-white rounded-[48px] group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-2xl shadow-violet-100">
            <FileText size={64} />
          </div>
        </div>
      </Link>

      {/* Seção 4: Negociação de Dívidas */}
      <Link href="/negociacoes" className="group block w-full bg-white border-b border-slate-100 hover:bg-amber-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[45vh] flex items-center justify-between flex-row-reverse text-left">
          <div className="max-w-xl text-left">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-amber-600 transition-colors">Negociação de Dívidas</h2>
            <p className="text-lg font-bold text-slate-400 mt-4 uppercase tracking-tight text-left">RECUPERAÇÃO DE ATIVOS</p>
            <p className="text-slate-500 mt-6 leading-relaxed text-left">
              Listagem de inadimplências acima de 60 dias. Agregação de passivo por CPF e roadmap com as ações de negociação extra judicial e judicial
            </p>
          </div>
          <div className="p-12 bg-slate-50 rounded-[48px] group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 group-hover:scale-110 shadow-2xl shadow-amber-100">
            <History size={64} />
          </div>
        </div>
      </Link>

      {/* Seção 5: CMMS */}
      <Link href="/cmms" className="group block w-full bg-white border-b border-slate-100 hover:bg-orange-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[45vh] flex items-center justify-between text-left">
          <div className="max-w-xl text-left">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-orange-600 transition-colors">CMMS</h2>
            <p className="text-lg font-bold text-slate-400 mt-4 uppercase tracking-tight text-left">Gestão de Ativos</p>
            <p className="text-slate-500 mt-6 leading-relaxed text-left">
              Controle da manutenção preventiva de todos os equipamentos do consultório, bem como do estoque de insumos não odontológicos.
            </p>
          </div>
          <div className="p-12 bg-slate-50 rounded-[48px] group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 group-hover:scale-105 shadow-2xl shadow-orange-100">
            <Wrench size={64} />
          </div>
        </div>
      </Link>

      {/* Seção 6: Supervisor IA (Nova Seção Injetada com Alinhamento Estrito e Layout Reverso) */}
      <Link href="/supervisor" className="group block w-full bg-slate-50/50 border-b border-slate-100 hover:bg-indigo-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[45vh] flex items-center justify-between flex-row-reverse text-left">
          <div className="max-w-xl text-left">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-indigo-600 transition-colors">Supervisor IA</h2>
            <p className="text-lg font-bold text-slate-400 mt-4 uppercase tracking-tight text-left">Auditoria e Controle Tático</p>
            <p className="text-slate-500 mt-6 leading-relaxed text-left">
              Central de inteligência artificial do Orion. Monitore o histórico de conversas fora de hora, configure janelas customizadas de plantão noturno e intervalo de almoço, e ajuste as diretrizes de persona e playbook do robô.
            </p>
          </div>
          <div className="p-12 bg-white rounded-[48px] group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 group-hover:-rotate-3 shadow-2xl shadow-indigo-100">
            <Bot size={64} />
          </div>
        </div>
      </Link>
    </div>
  );
}