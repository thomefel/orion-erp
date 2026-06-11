'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { Receipt, Send, FileText, History, Wrench, Bot, UserCheck } from 'lucide-react';

export default function HomePage() {
  const [cargo, setCargo] = useState<string | null>(null);

  useEffect(() => {
    getUserCargo();
  }, []);

  async function getUserCargo() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('funcionarios')
        .select('cargo')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data) setCargo(data.cargo);
    }
  }

  return (
    <div className="w-full">
      {/* Intro Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-7xl font-black text-slate-900 mb-4 tracking-tighter leading-tight italic uppercase">
          ORION <span className="text-blue-600 not-italic">AC ODONTOLOGIA</span>
        </h1>
        <p className="text-base text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed uppercase tracking-widest">
          Módulos de Controle Operacional Autorizados
        </p>
      </section>

      {/* RENDERIZAÇÃO FILTRADA DE MÓDULOS DE ACORDO COM O NIVEL DO PERFIL */}
      
      {/* SEÇÃO ADMIN 1: RECEBÍVEIS */}
      {cargo === 'administrador' && (
        <Link href="/recebiveis" className="group block w-full bg-white border-y border-slate-100 hover:bg-blue-50/30 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between">
            <div className="max-w-xl text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-blue-600 transition-colors">Recebíveis</h2>
              <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">FLUXO DE CAIXA E DEVEDORES</p>
              <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                Importação inteligente de planilhas do Simples Dental para alimentação do Orion Cloud. Prepare e valide sua base de dados antes de iniciar os disparos de mensagens automatizadas no WhatsApp.
              </p>
            </div>
            <div className="p-10 bg-slate-50 rounded-[40px] text-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-3 shadow-xl">
              <Receipt size={48} />
            </div>
          </div>
        </Link>
      )}

      {/* SEÇÃO ADMIN 2: CONTROLE DE ENVIOS */}
      {cargo === 'administrador' && (
        <Link href="/envios" className="group block w-full bg-slate-50/50 border-b border-slate-100 hover:bg-emerald-50/30 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between flex-row-reverse">
            <div className="max-w-xl text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-emerald-600 transition-colors">Controle de Envios</h2>
              <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">DISPARO DE MENSAGENS AUTOMATIZADO</p>
              <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                Gestão da fila de disparos via Evolution-API. Visualize a régua de cobrança automática (D-2 a D+15) e execute disparos manuais ou em piloto automático.
              </p>
            </div>
            <div className="p-10 bg-white rounded-[40px] text-slate-800 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 group-hover:-rotate-3 shadow-xl">
              <Send size={48} />
            </div>
          </div>
        </Link>
      )}

      {/* SEÇÃO ADMIN 3: NEGOCIAÇÃO DE DÍVIDAS */}
      {cargo === 'administrador' && (
        <Link href="/negociacoes" className="group block w-full bg-white border-b border-slate-100 hover:bg-amber-50/30 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between">
            <div className="max-w-xl text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-amber-600 transition-colors">Negociação de Dívidas</h2>
              <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">RECUPERAÇÃO DE ATIVOS</p>
              <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                Listagem de inadimplências acima de 60 dias. Agregação de passivo por CPF e fluxo estruturado em 3 trilhas paralelas com as ações de conciliação judiciais e cartoriais.
              </p>
            </div>
            <div className="p-10 bg-slate-50 rounded-[40px] text-slate-800 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 group-hover:scale-110 shadow-xl">
              <History size={48} />
            </div>
          </div>
        </Link>
      )}

      {/* SEÇÃO ADMIN 4: EMISSÃO FISCAL */}
      {cargo === 'administrador' && (
        <Link href="/fiscal" className="group block w-full bg-slate-50/50 border-b border-slate-100 hover:bg-violet-50/30 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between flex-row-reverse text-left">
            <div className="max-w-xl text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-violet-600 transition-colors">Emissão Fiscal</h2>
              <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">Automação de NFS-e</p>
              <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                Validação de registros fiscais e fila de emissão automatizada. Garanta a conformidade tributária da clínica com processos de envio em lote e monitoramento de status.
              </p>
            </div>
            <div className="p-10 bg-white rounded-[40px] text-slate-800 group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-xl">
              <FileText size={48} />
            </div>
          </div>
        </Link>
      )}

      {/* SEÇÃO HÍBRIDA 5: CMMS (Acessível por Admin e ASB) */}
      {['administrador', 'asb'].includes(cargo || '') && (
        <Link href="/cmms" className="group block w-full bg-white border-b border-slate-100 hover:bg-orange-50/30 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between text-left">
            <div className="max-w-xl text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-orange-600 transition-colors">CMMS</h2>
              <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">Gestão de Ativos</p>
              <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                Controle da manutenção preventiva de todos os equipamentos do consultório, bem como do estoque de insumos não odontológicos.
              </p>
            </div>
            <div className="p-10 bg-slate-50 rounded-[40px] text-slate-800 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 group-hover:scale-105 shadow-xl">
              <Wrench size={48} />
            </div>
          </div>
        </Link>
      )}

      {/* SEÇÃO HÍBRIDA 6: SUPERVISOR IA (Acessível por Admin e CRC) */}
      {['administrador', 'crc'].includes(cargo || '') && (
        <Link href="/supervisor" className="group block w-full bg-slate-50/50 border-b border-slate-100 hover:bg-indigo-50/30 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between flex-row-reverse text-left">
            <div className="max-w-xl text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-indigo-600 transition-colors">Supervisor IA</h2>
              <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">Auditoria e Controle Tático</p>
              <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                Central de inteligência artificial do Orion. Monitore o histórico de conversas fora de hora, configure janelas customizadas de plantão noturno e intervalo de almoço.
              </p>
            </div>
            <div className="p-10 bg-white rounded-[40px] text-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 group-hover:-rotate-3 shadow-xl">
              <Bot size={48} />
            </div>
          </div>
        </Link>
      )}

      {/* SEÇÃO UNIVERSAL 7: AVALIAÇÃO DE DESEMPENHO (Acessível por Todos os Cargos) */}
      <Link href="/desempenho" className="group block w-full bg-white border-b border-slate-100 hover:bg-indigo-50/30 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-[35vh] flex items-center justify-between text-left">
          <div className="max-w-xl text-left">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic group-hover:text-indigo-600 transition-colors">Avaliação de Desempenho</h2>
            <p className="text-xs font-black text-slate-400 mt-2 uppercase tracking-widest">Prontuário de Competências Técnicas</p>
            <p className="text-slate-500 text-sm mt-4 leading-relaxed">
              Consulte seu quadro histórico de metas mensais, acesse gráficos de evolução de competência em tempo real e verifique feedbacks táticos positivos e pontos de atenção direcionados.
            </p>
          </div>
          <div className="p-10 bg-slate-50 rounded-[40px] text-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-xl">
            <UserCheck size={48} />
          </div>
        </div>
      </Link>
    </div>
  );
}