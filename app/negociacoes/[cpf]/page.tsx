'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { 
  ChevronLeft, 
  Save, 
  Send, 
  FileDown, 
  CheckCircle2, 
  User, 
  Calendar,
  Loader2,
  AlertTriangle,
  Gavel,
  FileText,
  Scale,
  Trash2,
  XCircle
} from 'lucide-react';

export default function DetalheNegociacao() {
  const { cpf } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [devedor, setDevedor] = useState<any>(null);

  const [valorEditavel, setValorEditavel] = useState(0);
  const [msgAmigavel, setMsgAmigavel] = useState("");
  const [propostaDesconto, setPropostaDesconto] = useState(0);

  useEffect(() => {
    fetchDevedor();
  }, [cpf]);

  async function fetchDevedor() {
    const { data } = await supabase
      .from('devedores_historicos')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (data) {
      setDevedor(data);
      setValorEditavel(data.valor_total);
      setMsgAmigavel(`Olá, ${data.nome.split(' ')[0]}. Sou do setor de conciliação da AC Odontologia. Notamos valores pendentes há mais de 60 dias. Gostaríamos de ouvir você para chegarmos a uma solução boa para ambos. Podemos conversar sobre uma condição especial hoje?`);
    }
    setLoading(false);
  }

  const toggleFlag = async (field: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('devedores_historicos')
      .update({ [field]: !currentValue })
      .eq('cpf', cpf);
    if (!error) fetchDevedor();
  };

  const handleUpdateValue = async () => {
    setSaving(true);
    await supabase.from('devedores_historicos').update({ valor_total: valorEditavel }).eq('cpf', cpf);
    setSaving(false);
    fetchDevedor();
  };

  const handleDeleteDebt = async () => {
    const confirmDelete = confirm("ATENÇÃO: Deseja excluir permanentemente este registro de dívida? Esta ação não pode ser desfeita.");
    if (!confirmDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('devedores_historicos')
      .delete()
      .eq('cpf', cpf);

    if (!error) {
      router.push('/negociacoes');
    } else {
      alert("Erro ao excluir registro.");
      setIsDeleting(false);
    }
  };

  const enviarWhatsApp = async (texto: string) => {
    alert("Simulação: Mensagem enviada para o paciente!");
    if (!devedor.notificacao_amigavel) toggleFlag('notificacao_amigavel', false);
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase text-[10px] tracking-widest">Carregando Dashboard Tático...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="mb-10 text-left">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-6 transition-all cursor-pointer">
          <ChevronLeft size={16} /> Voltar para a lista
        </button>
        <h1 className="text-4xl font-black text-slate-900 uppercase italic">
          Gestão de <span className="text-blue-600 not-italic">Acordo</span>
        </h1>
        <p className="text-slate-500 font-medium mt-1">Roadmap Estratégico de Recuperação • {devedor.nome}</p>
      </header>

      {/* SEÇÃO 1: INFORMAÇÕES DA DÍVIDA */}
      <section className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm mb-12">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
          <User size={14} className="text-blue-600" /> Dossiê Consolidado do Devedor
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-end">
          <div className="md:col-span-1">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Paciente</label>
            <p className="font-bold text-slate-900 uppercase truncate">{devedor.nome}</p>
            <p className="font-mono text-[11px] text-slate-400 mt-1">{devedor.cpf}</p>
          </div>
          
          <div className="md:col-span-1">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Origem do Débito</label>
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Calendar size={14} className="text-slate-300" /> {new Date(devedor.data_divida).toLocaleDateString('pt-BR')}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic">{devedor.parcelas_qtd} parcelas em atraso</p>
          </div>

          <div className="md:col-span-2 flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-black text-blue-600 uppercase mb-2">Montante em Aberto (R$)</label>
              <input 
                type="number" 
                value={valorEditavel}
                onChange={(e) => setValorEditavel(Number(e.target.value))}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-xl text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <button 
              onClick={handleUpdateValue}
              className="h-[60px] px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Atualizar Dívida'}
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: TRILHO DE NEGOCIAÇÃO INTEGRADO */}
      <section className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-16 flex items-center gap-2">
          <Gavel size={14} className="text-blue-600" /> Fluxo Cronológico de Recuperação Extrajudicial e Judicial
        </h3>

        {/* RETA DO TRAJETO CONTÍNUA (Estendida até o final do conteúdo) */}
        <div className="absolute left-[71px] top-40 bottom-24 w-px bg-slate-100 z-0"></div>

        <div className="space-y-16 relative z-10">
          
          {/* 01. ABORDAGEM CONSULTIVA */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.notificacao_amigavel ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.notificacao_amigavel ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">01</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.notificacao_amigavel ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 italic">Abordagem Consultiva</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+60 a D+75</span>
              </div>
              <div className="flex gap-6 items-start">
                <textarea 
                  className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 font-medium h-24 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={msgAmigavel}
                  onChange={(e) => setMsgAmigavel(e.target.value)}
                />
                <div className="flex flex-col gap-3">
                    <button onClick={() => enviarWhatsApp(msgAmigavel)} className="bg-slate-900 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2 cursor-pointer">
                        <Send size={14} /> Enviar Mensagem
                    </button>
                    <button onClick={() => toggleFlag('notificacao_amigavel', devedor.notificacao_amigavel)} className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.notificacao_amigavel ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                        {devedor.notificacao_amigavel ? 'Realizado' : 'Marcar Executado'}
                    </button>
                </div>
              </div>
            </div>
          </div>

          {/* 02. PROPOSTA DE ACORDO */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.proposta_enviada ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.proposta_enviada ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">02</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.proposta_enviada ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 italic">Proposta de Acordo</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+60 a D+75</span>
              </div>
              <div className="flex gap-8 items-end">
                <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Simular Desconto de Cortesia (R$)</label>
                    <input type="number" placeholder="0,00" value={propostaDesconto} onChange={(e) => setPropostaDesconto(Number(e.target.value))} className="w-full bg-white border border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none" />
                </div>
                <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Valor Líquido da Proposta</label>
                    <p className="text-xl font-black text-blue-600">R$ {(valorEditavel - propostaDesconto).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <button onClick={() => toggleFlag('proposta_enviada', devedor.proposta_enviada)} className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.proposta_enviada ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg'}`}>
                    {devedor.proposta_enviada ? 'Proposta Salva' : 'Registrar Envio'}
                </button>
              </div>
            </div>
          </div>

          {/* 03. NOTIFICAÇÃO EXTRAJUDICIAL */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.notificacao_extrajudicial ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.notificacao_extrajudicial ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">03</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.notificacao_extrajudicial ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 italic">Notificação Extrajudicial</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+75 a D+90</span>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 flex items-center justify-center gap-3 bg-white border border-slate-200 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600 shadow-sm cursor-pointer">
                  <FileText size={18} className="text-blue-600" /> Emitir PDF de Notificação Formal
                </button>
                <button onClick={() => toggleFlag('notificacao_extrajudicial', devedor.notificacao_extrajudicial)} className={`px-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.notificacao_extrajudicial ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  {devedor.notificacao_extrajudicial ? 'Notificado' : 'Marcar Executado'}
                </button>
              </div>
            </div>
          </div>

          {/* 04. ACORDO FIRMADO */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.acordo_firmado ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.acordo_firmado ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">04</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.acordo_firmado ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 italic">Firmamento de Acordo</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+75 a D+90</span>
              </div>
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-medium text-slate-500">O paciente aceitou formalmente os termos da negociação e os novos prazos de pagamento.</p>
                <button onClick={() => toggleFlag('acordo_firmado', devedor.acordo_firmado)} className={`px-12 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.acordo_firmado ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg'}`}>
                   {devedor.acordo_firmado ? 'Acordo Ativo' : 'Confirmar Aceite'}
                </button>
              </div>
            </div>
          </div>

          {/* 05. CONFISSÃO DE DÍVIDA */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.confissao_assinada ? 'bg-violet-600 text-white shadow-violet-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.confissao_assinada ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">05</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.confissao_assinada ? 'bg-violet-50/30 border-violet-100' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 italic">Confissão de Dívida</h4>
                    <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded border border-amber-100">Título Executivo</span>
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+75 a D+90</span>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 flex items-center justify-center gap-3 bg-white border border-slate-200 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600 shadow-sm cursor-pointer">
                  <FileDown size={18} className="text-violet-600" /> Gerar Termo p/ Assinatura (Art. 784, III, CPC)
                </button>
                <button onClick={() => toggleFlag('confissao_assinada', devedor.confissao_assinada)} className={`px-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.confissao_assinada ? 'bg-violet-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  {devedor.confissao_assinada ? 'Assinado' : 'Marcar Executado'}
                </button>
              </div>
            </div>
          </div>

          {/* 06. CARTÓRIO E RESTRIÇÕES */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.protesto_realizado ? 'bg-red-600 text-white shadow-red-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.protesto_realizado ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">06</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.protesto_realizado ? 'bg-red-50/30 border-red-100' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 italic">Medidas Coercitivas</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+90 a D+120</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => toggleFlag('protesto_realizado', devedor.protesto_realizado)} className={`py-5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.protesto_realizado ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-red-200'}`}>
                    Protestar em Cartório (Itapema/SC)
                  </button>
                  <button className="py-5 rounded-2xl border border-slate-100 bg-white font-black text-[10px] uppercase tracking-widest text-slate-300 cursor-not-allowed">
                    Negativação SPC/Serasa
                  </button>
              </div>
            </div>
          </div>

          {/* 07. JUDICIALIZAÇÃO */}
          <div className="flex gap-12 group">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${devedor.judicializado ? 'bg-slate-900 text-white shadow-slate-100' : 'bg-white border-2 border-slate-100 text-slate-200'}`}>
                {devedor.judicializado ? <Scale size={20} /> : <span className="font-black text-xs">07</span>}
              </div>
            </div>
            <div className={`flex-1 p-8 rounded-[32px] border transition-all duration-500 ${devedor.judicializado ? 'bg-slate-900 text-white' : 'bg-slate-50/50 border-transparent'}`}>
              <div className="flex justify-between items-start mb-6">
                <h4 className={`font-black text-sm uppercase tracking-widest italic ${devedor.judicializado ? 'text-blue-400' : 'text-slate-900'}`}>Execução Judicial</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">D+120 +</span>
              </div>
              <div className={`p-6 rounded-2xl border flex items-center justify-between ${devedor.judicializado ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                 <div className="flex items-center gap-4">
                    <AlertTriangle className={devedor.judicializado ? 'text-blue-400' : 'text-red-500'} size={24} />
                    <div>
                        <p className={`text-xs font-black uppercase tracking-tight ${devedor.judicializado ? 'text-white' : 'text-slate-900'}`}>Ajuizamento de Ação</p>
                        <p className="text-[10px] font-medium text-slate-400">Preparar dossiê completo para o fórum de Itapema.</p>
                    </div>
                 </div>
                 <button onClick={() => toggleFlag('judicializado', devedor.judicializado)} className={`px-12 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${devedor.judicializado ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                    {devedor.judicializado ? 'Processo Ativo' : 'Iniciar Judicialização'}
                 </button>
              </div>
            </div>
          </div>

          {/* 08. ENCERRAMENTO DO REGISTRO (DENTRO DO TRILHO) */}
          <div className="flex gap-12 group pb-8">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 border-slate-100 text-red-500 shadow-xl transition-all duration-500">
                <Trash2 size={20} />
              </div>
            </div>
            <div className="flex-1 p-8 rounded-[32px] bg-red-50/30 border border-transparent">
              <div className="flex justify-between items-start mb-6">
                <h4 className="font-black text-sm uppercase tracking-widest text-red-600 italic">Descarte ou Quitação Final</h4>
                <span className="text-[10px] font-black text-slate-300 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">Fim da Trajetória</span>
              </div>
              <button 
                onClick={handleDeleteDebt}
                disabled={isDeleting}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                {isDeleting ? 'Excluindo...' : 'Excluir Registro de Dívida permanentemente'}
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}