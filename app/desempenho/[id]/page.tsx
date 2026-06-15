'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { 
  UserCheck, Plus, CheckSquare, Layers, Calendar, 
  Loader2, Trash2, XCircle, ChevronLeft, ChevronDown, ChevronUp, Pencil
} from 'lucide-react';

export default function FolhaDesempenhoFuncionario() {
  const { id } = useParams();
  const router = useRouter();

  // Estados Operacionais de Dados
  const [funcionario, setFuncionario] = useState<any>(null);
  const [metas, setMetas] = useState<any[]>([]);
  const [apontamentos, setApontamentos] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  // Controles de Interface UI
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMetaFormExpanded, setIsMetaFormExpanded] = useState(true);
  const [activeMetaTab, setActiveMetaTab] = useState<number | null>(null);
  const [editingApontamento, setEditingApontamento] = useState<any>(null);
  const [editingMeta, setEditingMeta] = useState<any>(null);
  const [editingFeedback, setEditingFeedback] = useState<any>(null);

  // Formulários de Inclusão e Edição (Apenas Modo Admin)
  const [formMetaNome, setFormMetaNome] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');
  const [formMetaMetrica, setFormMetaMetrica] = useState('%');
  const [formMetaValor, setFormMetaValor] = useState('');

  const [formApMetaId, setFormApMetaId] = useState('');
  const [formApValor, setFormApValor] = useState('');
  const [formApMesAno, setFormApMesAno] = useState('');

  const [formFbTipo, setFormFbTipo] = useState('positivo');
  const [formFbDesc, setFormFbDesc] = useState('');

  useEffect(() => {
    verificarAcessoEPuxarDados();
  }, [id]);

  async function verificarAcessoEPuxarDados() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: logado } = await supabase
      .from('funcionarios')
      .select('cargo')
      .eq('id', session.user.id)
      .maybeSingle();

    const checkAdmin = logado?.cargo === 'administrador';
    setIsAdmin(checkAdmin);

    if (!checkAdmin && session.user.id !== id) {
      alert('Acesso não autorizado: Você só possui permissão para ler o seu dossiê.');
      router.push(`/desempenho/${session.user.id}`);
      return;
    }

    const { data: func } = await supabase.from('funcionarios').select('*').eq('id', id).maybeSingle();
    if (func) setFuncionario(func);

    await puxarMetasEDetalhes();
    setLoading(false);
  }

  async function puxarMetasEDetalhes() {
    const { data: mt, error: errMt } = await supabase
      .from('desempenho_metas')
      .select('*')
      .eq('funcionario_id', id)
      .order('criado_at', { ascending: true });
    
    if (errMt) console.error("[ORION ERRO] Falha ao sincronizar desempenho_metas:", errMt);

    const listaMetas = mt || [];
    setMetas(listaMetas);

    if (listaMetas.length > 0 && !activeMetaTab) {
      setActiveMetaTab(listaMetas[0].id);
    }

    if (listaMetas.length > 0) {
      const idsMetas = listaMetas.map(m => m.id);
      const { data: ap, error: errAp } = await supabase
        .from('desempenho_apontamentos')
        .select('*')
        .in('meta_id', idsMetas)
        .order('mes_ano', { ascending: true });
      
      if (errAp) console.error("[ORION ERRO] Falha ao sincronizar desempenho_apontamentos:", errAp);
      setApontamentos(ap || []);
    }

    const { data: fb, error: errFb } = await supabase
      .from('desempenho_feedbacks')
      .select('*')
      .eq('funcionario_id', id)
      .order('criado_at', { ascending: true });
    
    if (errFb) console.error("[ORION ERRO] Falha ao sincronizar desempenho_feedbacks:", errFb);
    setFeedbacks(fb || []);
  }

  // OPERAÇÕES ADMIN: Ativar Modo de Edição de uma Meta com rolagem reativa
  const handleStartEditMeta = (m: any) => {
    setEditingMeta(m);
    setFormMetaNome(m.nome_meta);
    setFormMetaDesc(m.descricao || '');
    setFormMetaMetrica(m.metrica);
    setFormMetaValor(String(m.valor_meta));
    setIsMetaFormExpanded(true); 
    
    // Smooth scroll defensivo: Aguarda a expansão do painel no DOM antes de rolar
    setTimeout(() => {
      document.getElementById('painel-config-desempenho')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // OPERAÇÕES ADMIN: Cancelar Edição Ativa de Meta
  const handleCancelEditMeta = () => {
    setEditingMeta(null);
    setFormMetaNome('');
    setFormMetaDesc('');
    setFormMetaMetrica('%');
    setFormMetaValor('');
  };

  // OPERAÇÕES ADMIN: Salvar ou Atualizar Meta Primária (UPSTREAM RECONFIGURADO)
  const handleCreateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !formMetaNome.trim() || !formMetaValor) return;
    setIsProcessing(true);

    if (editingMeta) {
      // MODO ATUALIZAÇÃO (UPSTREAM)
      const { error } = await supabase
        .from('desempenho_metas')
        .update({
          nome_meta: formMetaNome.trim(),
          descricao: formMetaDesc.trim(),
          metrica: formMetaMetrica.trim(),
          valor_meta: Number(formMetaValor)
        })
        .eq('id', editingMeta.id);

      if (!error) handleCancelEditMeta();
    } else {
      // MODO INSERÇÃO SIMPLES (CRIAR NOVO)
      await supabase.from('desempenho_metas').insert([{
        funcionario_id: id,
        nome_meta: formMetaNome.trim(),
        descricao: formMetaDesc.trim(),
        metrica: formMetaMetrica.trim(),
        valor_meta: Number(formMetaValor)
      }]);
      setFormMetaNome(''); setFormMetaDesc(''); setFormMetaValor('');
    }

    await puxarMetasEDetalhes();
    setIsProcessing(false);
  };

  // OPERAÇÕES ADMIN: Ativar Modo de Edição de um Apontamento com rolagem reativa
  const handleStartEditApontamento = (ap: any) => {
    setEditingApontamento(ap);
    setFormApMetaId(String(ap.meta_id));
    setFormApValor(String(ap.valor_medido));
    setFormApMesAno(ap.mes_ano);
    setIsMetaFormExpanded(true); 

    // Smooth scroll defensivo: Aguarda a expansão do painel no DOM antes de rolar
    setTimeout(() => {
      document.getElementById('painel-config-desempenho')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // OPERAÇÕES ADMIN: Cancelar Edição Ativa de Apontamento
  const handleCancelEditApontamento = () => {
    setEditingApontamento(null);
    setFormApMetaId('');
    setFormApValor('');
    setFormApMesAno('');
  };

  // OPERAÇÕES ADMIN: Criar ou Atualizar Medição/Apontamento Mensal
  const handleCreateApontamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !formApMetaId || !formApValor || !formApMesAno) return;
    setIsProcessing(true);

    if (editingApontamento) {
      const { error } = await supabase
        .from('desempenho_apontamentos')
        .update({
          meta_id: Number(formApMetaId),
          valor_medido: Number(formApValor),
          mes_ano: formApMesAno
        })
        .eq('id', editingApontamento.id);

      if (!error) handleCancelEditApontamento();
    } else {
      await supabase.from('desempenho_apontamentos').insert([{
        meta_id: Number(formApMetaId),
        valor_medido: Number(formApValor),
        mes_ano: formApMesAno
      }]);
      setFormApValor(''); setFormApMesAno('');
    }

    await puxarMetasEDetalhes();
    setIsProcessing(false);
  };

  // OPERAÇÕES ADMIN: Ativar Modo de Edição de um Feedback com rolagem reativa
  const handleStartEditFeedback = (fb: any) => {
    setEditingFeedback(fb);
    setFormFbTipo(fb.tipo);
    setFormFbDesc(fb.descricao);
    setIsMetaFormExpanded(true);

    setTimeout(() => {
      document.getElementById('painel-config-desempenho')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // OPERAÇÕES ADMIN: Cancelar Edição Ativa de Feedback
  const handleCancelEditFeedback = () => {
    setEditingFeedback(null);
    setFormFbTipo('positivo');
    setFormFbDesc('');
  };

  // OPERAÇÕES ADMIN: Criar ou Atualizar Lançamento de Feedback Tático (HÍBRIDO UPSTREAM)
  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !formFbDesc.trim()) return;
    setIsProcessing(true);

    if (editingFeedback) {
      // MODO ATUALIZAÇÃO
      const { error } = await supabase
        .from('desempenho_feedbacks')
        .update({
          tipo: formFbTipo,
          descricao: formFbDesc.trim()
        })
        .eq('id', editingFeedback.id);

      if (!error) handleCancelEditFeedback();
    } else {
      // MODO INSERÇÃO SIMPLES
      await supabase.from('desempenho_feedbacks').insert([{
        funcionario_id: id,
        tipo: formFbTipo,
        descricao: formFbDesc.trim()
      }]);
      setFormFbDesc('');
    }

    await puxarMetasEDetalhes();
    setIsProcessing(false);
  };

  // OPERAÇÕES: Alterar Efeito Hachurado dos Checklists Internos (Estilo CMMS)
  const handleToggleFeedbackCheck = async (fbId: number, currentStatus: boolean) => {
    const { error } = await supabase.from('desempenho_feedbacks').update({ concluido: !currentStatus }).eq('id', fbId);
    if (!error) await puxarMetasEDetalhes();
  };

  // OPERAÇÕES ADMIN: Higienizar Itens de Lançamento por ID
  const handleDeleteItem = async (table: string, itemId: number) => {
    if (!isAdmin || !confirm('Deseja excluir permanentemente este parâmetro da folha técnica?')) return;
    setIsProcessing(true);
    const { error } = await supabase.from(table).delete().eq('id', itemId);
    if (!error) {
      if (table === 'desempenho_apontamentos' && editingApontamento?.id === itemId) {
        handleCancelEditApontamento();
      }
      if (table === 'desempenho_metas' && editingMeta?.id === itemId) {
        handleCancelEditMeta();
      }
      if (table === 'desempenho_feedbacks' && editingFeedback?.id === itemId) {
        handleCancelEditFeedback(); // Segurança: Aborta edição se deletar o item em foco
      }
      await puxarMetasEDetalhes();
    }
    setIsProcessing(false);
  };

  // Filtragens estruturadas locais em memória
  const metaSelecionada = metas.find(m => m.id === activeMetaTab);
  const apontamentosDaMetaAtiva = apontamentos.filter(ap => ap.meta_id === activeMetaTab);

  const feedbacksPositivos = feedbacks.filter(f => f.tipo === 'positivo');
  const feedbacksAtencao = feedbacks.filter(f => f.tipo === 'atencao');

  // CÁLCULO VETORIAL DOS EIXOS CARTESIANOS DO GRÁFICO (ORDENADAS PROPORCIONAIS)
  const targetMetaVal = metaSelecionada ? Number(metaSelecionada.valor_meta) : 100;
  const maxMedido = apontamentosDaMetaAtiva.length > 0 
    ? Math.max(...apontamentosDaMetaAtiva.map(ap => Number(ap.valor_medido))) 
    : 0;
  
  const yMax = Math.max(targetMetaVal, maxMedido) * 1.15 || 100;
  const ticksY = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0];

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-[10px] tracking-widest uppercase">Carregando dossiê de metas do funcionário...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="mb-10 text-left">
        {isAdmin && (
          <button onClick={() => router.push('/desempenho')} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-6 transition-all cursor-pointer">
            <ChevronLeft size={16} /> Voltar
          </button>
        )}
        <h1 className="text-4xl font-black text-slate-900 uppercase italic">
          Avaliação de Desempenho
        </h1>
        <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-wider">{funcionario?.cargo}</p>
      </header>

      {/* PAINEL EXCLUSIVO DO ADMINISTRADOR: ESTRUTURA EXPANSÍVEL ESTILO CMMS (Adicionado ID de ancoragem de rolagem) */}
      {isAdmin && (
        <section id="painel-config-desempenho" className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-10 w-full text-left scroll-mt-24">
          <div 
            onClick={() => setIsMetaFormExpanded(!isMetaFormExpanded)}
            className="p-6 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
               {isMetaFormExpanded ? <ChevronUp className="text-blue-600" size={20} /> : <ChevronDown className="text-blue-600" size={20} />}
               <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">
                 Registros
               </span>
            </div>
            <Layers size={16} className="text-slate-300" />
          </div>

          {isMetaFormExpanded && (
            <div className="p-8 border-t border-slate-50 space-y-8 animate-in slide-in-from-top-4 duration-300">
              
              {/* FORMULÁRIO 1: CRIAR / EDITAR META PRIMÁRIA (MODIFICADO) */}
              <form onSubmit={handleCreateMeta} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pb-6 border-b border-dashed border-slate-100">
                <div className="md:col-span-1 text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Nome da Meta</label>
                  <input type="text" value={formMetaNome} onChange={e => setFormMetaNome(e.target.value)} placeholder="Ex: Conversão de Leads Convênios" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700" required />
                </div>
                <div className="md:col-span-1 text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Descrição</label>
                  <input type="text" value={formMetaDesc} onChange={e => setFormMetaDesc(e.target.value)} placeholder="Foco no agendamento de consultas particulares" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700" />
                </div>
                <div className="md:col-span-1 grid grid-cols-2 gap-2 text-left">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 text-center">Métrica</label>
                    <input type="text" value={formMetaMetrica} onChange={e => setFormMetaMetrica(e.target.value)} placeholder="%, R$, Qtd" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center outline-none text-slate-700" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 text-center">Alvo Meta</label>
                    <input type="number" step="0.01" value={formMetaValor} onChange={e => setFormMetaValor(e.target.value)} placeholder="80" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center outline-none text-slate-700" required />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button type="submit" disabled={isProcessing} className={`flex-1 py-3 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md ${editingMeta ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-blue-600'}`}>
                    {editingMeta ? '✔ Salvar Edição' : '+ Criar Meta'}
                  </button>
                  {editingMeta && (
                    <button type="button" onClick={handleCancelEditMeta} className="px-3 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              {/* FORMULÁRIO 2: LANÇAR / EDITAR APONTAMENTO MENSAL */}
              <form onSubmit={handleCreateApontamento} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pb-6 border-b border-dashed border-slate-100">
                <div className="text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Vincular à Meta</label>
                  <select value={formApMetaId} onChange={e => setFormApMetaId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700 uppercase" required>
                    <option value="">Selecione a Meta...</option>
                    {metas.map(m => <option key={m.id} value={m.id}>{m.nome_meta}</option>)}
                  </select>
                </div>
                <div className="text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Valor Medido no Mês</label>
                  <input type="number" step="0.01" value={formApValor} onChange={e => setFormApValor(e.target.value)} placeholder="Ex: 78.50" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700" required />
                </div>
                <div className="text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Mês de Competência</label>
                  <input type="month" value={formApMesAno} onChange={e => setFormApMesAno(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700 font-mono cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer" required />
                </div>
                
                <div className="flex gap-2">
                  <button type="submit" disabled={isProcessing} className={`flex-1 py-3 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md ${editingApontamento ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-blue-600'}`}>
                    {editingApontamento ? '✔ Salvar Edição' : '+ Lançar Medição'}
                  </button>
                  {editingApontamento && (
                    <button type="button" onClick={handleCancelEditApontamento} className="px-3 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              {/* FORMULÁRIO 3: CRIAR FEEDBACK GERAL */}
              <form onSubmit={handleCreateFeedback} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
                <div className="text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Feedback</label>
                  <select value={formFbTipo} onChange={e => setFormFbTipo(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700" required>
                    <option value="positivo">Ponto Positivo</option>
                    <option value="atencao">Ponto de Atenção</option>
                  </select>
                </div>
                <div className="md:col-span-2 text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Descrição</label>
                  <input type="text" value={formFbDesc} onChange={e => setFormFbDesc(e.target.value)} placeholder="Excelente engajamento e preenchimento ágil da fila Orion ERP" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={isProcessing} className={`flex-1 py-3 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md ${editingFeedback ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-blue-600'}`}>
                    {editingFeedback ? '✔ Salvar Edição' : '+ Lançar Feedback'}
                  </button>
                  {editingFeedback && (
                    <button type="button" onClick={handleCancelEditFeedback} className="px-3 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

            </div>
          )}
        </section>
      )}

      {/* SEÇÃO DO GRÁFICO CARTESIANO DE BARRAS DE ALTA PRECISÃO */}
      <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl mb-10 text-left">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2 select-none">
          <Calendar size={14} className="text-blue-600" /> Desempenho
        </h3>

        {metas.length === 0 ? (
          <div className="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhuma meta acoplada ao prontuário deste funcionário.</div>
        ) : (
          <div className="space-y-8">
            
            {/* Abas Horizontais das Metas (MODIFICADO COM ÍCONE DE EDIÇÃO) */}
            <div className="flex gap-2 border-b border-slate-100 pb-4 overflow-x-auto select-none">
              {metas.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 shrink-0 bg-slate-50 rounded-xl p-1">
                  <button
                    onClick={() => setActiveMetaTab(m.id)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeMetaTab === m.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {m.nome_meta}
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleStartEditMeta(m)} 
                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-md transition-all cursor-pointer"
                        title="Editar esta Meta"
                      >
                        <Pencil size={11} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('desempenho_metas', m.id)} 
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-white rounded-md transition-all mr-1 cursor-pointer"
                        title="Excluir esta Meta"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sumário Descritivo de Competência */}
            {metaSelecionada && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50 flex justify-between items-center text-xs select-none">
                <div className="text-left">
                  <p className="font-black text-slate-800 uppercase tracking-wide">{metaSelecionada.nome_meta}</p>
                  <p className="text-slate-400 font-medium mt-0.5">{metaSelecionada.descricao || 'Sem descrição cadastrada'}</p>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Meta</span>
                  <span className="text-base font-black text-blue-600">{metaSelecionada.valor_meta}{metaSelecionada.metrica}</span>
                </div>
              </div>
            )}

            {/* ÁREA INTEGRADA DO GRÁFICO COM EIXOS COORDENADOS E ORDENADOS */}
            {apontamentosDaMetaAtiva.length === 0 ? (
              <div className="py-12 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest select-none">Gráfico vazio.</div>
            ) : (
              <div className="flex w-full gap-2 items-stretch pt-6 pb-12 bg-slate-50/30 p-6 rounded-[32px] border border-slate-100 overflow-x-auto">
                
                {/* EIXO Y (ORDENADAS): Reta delimitadora mantida com o divisor border-r */}
                <div className="flex flex-col justify-between text-right text-[9px] font-mono font-black text-slate-400 w-20 h-64 pr-3 border-r border-slate-200 select-none shrink-0 pb-1">
                  {ticksY.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-end gap-1 h-0">
                      <span>{t.toFixed(1)}</span>
                      <span className="text-[7px] font-sans font-bold text-slate-300 uppercase tracking-tighter">{metaSelecionada?.metrica}</span>
                    </div>
                  ))}
                </div>

                {/* ÁREA MESTRE DE PLOTAGEM VETORIAL: Injetado o 'border-b border-slate-200' criando a reta física do EIXO X */}
                <div className="flex-1 h-64 relative flex items-end gap-8 justify-start pl-6 min-w-[400px] border-b border-slate-200">
                  
                  {/* Linhas Horizontais de Grade de Fundo */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-2 pb-1">
                    {ticksY.map((_, idx) => (
                      <div key={idx} className="w-full border-b border-slate-200/40 first:border-t-0 last:border-b-0"></div>
                    ))}
                  </div>

                  {/* LINHA DE META ALVO (GOAL LINE): Injetada a unidade da métrica de forma dinâmica ao final */}
                  {metaSelecionada && (
                    <div 
                      style={{ bottom: `${(targetMetaVal / yMax) * 100}%` }} 
                      className="absolute left-0 w-full border-t-2 border-dashed border-red-400/50 z-10 pointer-events-none transition-all"
                    >
                      <span className="absolute right-4 top-[-16px] bg-red-50 border border-red-100 text-red-600 font-black text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm">
                        Meta: {metaSelecionada.valor_meta}{metaSelecionada.metrica}
                      </span>
                    </div>
                  )}

                  {/* RENDERIZAÇÃO PROPORCIONAL LINEAR DAS BARRAS */}
                  {apontamentosDaMetaAtiva.map((ap) => {
                    const percentualBarra = (Number(ap.valor_medido) / yMax) * 100;
                    const atingiuMeta = Number(ap.valor_medido) >= targetMetaVal;
                    
                    return (
                      <div key={ap.id} className="flex flex-col items-center justify-end h-full relative w-12 shrink-0 z-20 group">
                        
                        {/* Tooltip Flutuante */}
                        <span className="absolute top-[-24px] bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all shadow-md z-30 pointer-events-none whitespace-nowrap">
                          {ap.valor_medido} {metaSelecionada?.metrica}
                        </span>
                        
                        {/* Barra Hidratada */}
                        <div 
                          style={{ height: `${percentualBarra}%` }} 
                          className={`w-full rounded-t-lg transition-all duration-500 shadow-md ${
                            atingiuMeta ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'
                          }`}
                        ></div>
                        
                        {/* LEGENDA DO EIXO X: Alinhada perfeitamente abaixo da nova reta sólida */}
                        <div className="absolute bottom-[-24px] text-[9px] font-mono font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap select-none">
                          {ap.mes_ano.split('-').reverse().join('/')}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>
            )}

          </div>
        )}
        {apontamentosDaMetaAtiva.length === 0 ? (
          <div className="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Sem registros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Mês</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Medição</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Meta</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Meta Batida</th>
                  {isAdmin && <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Edição</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {apontamentosDaMetaAtiva.map((ap) => {
                  const percentualIndex = targetMetaVal > 0 ? (Number(ap.valor_medido) / targetMetaVal) * 100 : 0;
                  const atingiu = percentualIndex >= 100;
                  return (
                    <tr key={ap.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-6 font-bold text-slate-900 uppercase text-xs">
                        {ap.mes_ano.split('-').reverse().join('/')}
                      </td>
                      <td className="p-6 text-center font-mono font-black text-slate-800 text-xs">
                        {ap.valor_medido} {metaSelecionada?.metrica}
                      </td>
                      <td className="p-6 text-center text-slate-500 text-xs font-bold uppercase">
                        {targetMetaVal} {metaSelecionada?.metrica}
                      </td>
                      <td className="p-6 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                          atingiu ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {atingiu ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-6 text-center">
                          <div className="flex items-center justify-center gap-2.5">
                            <button 
                              onClick={() => handleStartEditApontamento(ap)}
                              className="p-2 border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
                              title="Editar este lançamento"
                            >
                              <Pencil size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem('desempenho_apontamentos', ap.id)}
                              className="p-2 border border-slate-200 text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 rounded-xl transition-all cursor-pointer shadow-sm"
                              title="Excluir lançamento"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SEÇÃO MATRIZ DE FEEDBACKS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full text-left">
        
        {/* COLUNA ESQUERDA: PONTOS POSITIVOS */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-2xl min-h-[300px] text-left">
          <h4 className="font-black text-xs text-emerald-600 uppercase tracking-wider mb-6 pb-2 border-b flex items-center gap-2 select-none">
            Pontos Positivos
          </h4>
          {feedbacksPositivos.length === 0 ? (
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest py-10 text-center">Sem lançamentos.</p>
          ) : (
            <div className="space-y-2.5 text-left">
              {feedbacksPositivos.map((fb) => (
                <div key={fb.id} className="p-4 bg-emerald-50/10 border border-emerald-100/40 rounded-2xl flex justify-between items-center text-xs font-bold text-slate-700 hover:bg-emerald-50/20 transition-colors text-left">
                  <span className="leading-relaxed text-left">{fb.descricao}</span>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <button onClick={() => handleStartEditFeedback(fb)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-md transition-all cursor-pointer" title="Editar Feedback">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => handleDeleteItem('desempenho_feedbacks', fb.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-white rounded-md transition-all cursor-pointer" title="Excluir Feedback">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: PONTOS DE ATENÇÃO */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-2xl min-h-[300px] text-left">
          <h4 className="font-black text-xs text-amber-500 uppercase tracking-wider mb-6 pb-2 border-b flex items-center gap-2 select-none">
            Pontos de Atenção
          </h4>
          {feedbacksAtencao.length === 0 ? (
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest py-10 text-center">Sem lançamentos.</p>
          ) : (
            <div className="space-y-2.5 text-left">
              {feedbacksAtencao.map((fb) => (
                <div 
                  key={fb.id} 
                  className={`p-4 rounded-2xl border transition-all flex justify-between items-center text-xs font-bold text-left ${
                    fb.concluido 
                      ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60' 
                      : 'bg-red-50/10 border-red-100/40 text-slate-800 hover:bg-red-50/20'
                  }`}
                >
                  <span className={`leading-relaxed text-left transition-all ${fb.concluido ? 'line-through font-medium text-slate-400' : ''}`}>
                    {fb.descricao}
                  </span>
                  
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button 
                      onClick={() => handleToggleFeedbackCheck(fb.id, fb.concluido)}
                      className={`p-1 rounded-md border transition-all cursor-pointer ${
                        fb.concluido ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
                      }`}
                    >
                      <CheckSquare size={13} className={fb.concluido ? 'opacity-100' : 'opacity-0'} />
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleStartEditFeedback(fb)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-md transition-all cursor-pointer" title="Editar Feedback">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteItem('desempenho_feedbacks', fb.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-white rounded-md transition-all cursor-pointer" title="Excluir Feedback">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>

    </div>
  );
}