'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Wrench, 
  Plus, 
  CheckSquare, 
  Layers, 
  AlertTriangle, 
  Calendar, 
  Box, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Trash2, 
  XCircle,
  Settings,
  Activity
} from 'lucide-react';

export default function CmmsPage() {
  // Estados Globais de Dados
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [manutencoesGlobais, setManutencoesGlobais] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  
  // Controles de UI e Processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Aguardando comandos da mesa técnica...');
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [selectedEquipamento, setSelectedEquipamento] = useState<any>(null); // Controle do Modal

  // Formulário: Cadastro de Equipamento (Isolado)
  const [eqNome, setEqNome] = useState('');
  const [eqMarca, setEqMarca] = useState('');
  const [eqLocal, setEqLocal] = useState('');
  
  // Formulário: Nova Manutenção Periódica (Dentro do Modal)
  const [mNome, setMNome] = useState('');
  const [mFreq, setMFreq] = useState('180');
  const [mUltimaExec, setMUltimaExec] = useState(new Date().toISOString().split('T')[0]);
  const [passosInput, setPassosInput] = useState<string[]>(['']);

  // Formulário: Cadastro de Insumo
  const [insNome, setInsNome] = useState('');
  const [insQtdAtual, setInsQtdAtual] = useState('5');
  const [insQtdMin, setInsQtdMin] = useState('2');

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Busca e processamento com técnica de instância única espelhada do Módulo Fiscal
  async function fetchInitialData() {
    setIsProcessing(true);
    try {
      // 1. Equipamentos
      const { data: eqData, error: errEq } = await supabase.from('cmms_equipamentos').select('*').order('nome');
      if (errEq) throw errEq;
      setEquipamentos(eqData || []);

      // 2. Insumos
      const { data: insData, error: errIns } = await supabase.from('cmms_insumos').select('*').order('nome');
      if (errIns) throw errIns;
      setInsumos(insData || []);

      // 3. Todas as Manutenções para a Linha do Tempo Global
      const { data: manData, error: errMan } = await supabase
        .from('cmms_manutencoes_periodicas')
        .select(`
          *,
          cmms_equipamentos ( nome, localizacao ),
          cmms_passos_manutencao ( id, ordem_passo, descricao )
        `);
      if (errMan) throw errMan;
      
      if (manData) {
        const formatadas = manData.map((m: any) => {
          const hoje = new Date();
          const proxima = new Date(m.proxima_execucao);
          const diffTime = proxima.getTime() - hoje.getTime();
          const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { ...m, diasRestantes };
        }).sort((a, b) => a.diasRestantes - b.diasRestantes);
        
        setManutencoesGlobais(formatadas);
        
        // Sincronização do estado interno do modal ativo
        if (selectedEquipamento) {
          const atualizado = eqData?.find(e => e.id === selectedEquipamento.id);
          if (atualizado) setSelectedEquipamento(atualizado);
        }
      }
      setStatus('Módulo CMMS operando em barramento global estável. RLS ativo.');
    } catch (err: any) {
      console.error('Erro de execução no carregamento:', err);
      setStatus(`Erro de sincronização: ${err.message || 'Falha na leitura contínua'}`);
    } finally {
      setIsProcessing(false);
    }
  }

  // Filtragem local de tarefas específicas do Ativo aberto no Modal
  const manutencoesDoAtivoSelecionado = manutencoesGlobais.filter(
    m => selectedEquipamento && m.equipamento_id === selectedEquipamento.id
  );

  // Manipulação de Linhas de Passos (Checklist) dentro do Modal
  const handleAddPassoRow = () => setPassosInput([...passosInput, '']);
  const handlePassoChange = (index: number, val: string) => {
    const next = [...passosInput];
    next[index] = val;
    setPassosInput(next);
  };
  const handleRemovePassoRow = (index: number) => {
    if (passosInput.length === 1) return;
    setPassosInput(passosInput.filter((_, i) => i !== index));
  };

  // OPERAÇÃO 1: Salvar Equipamento Isolado (Payload puro, técnica limpa do módulo fiscal)
  const handleSaveEquipamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqNome.trim()) {
      alert('O nome do equipamento é obrigatório para registro.');
      return;
    }
    setIsProcessing(true);
    setStatus('Gravando ativo clínico na partição de segurança...');
    try {
      const { error } = await supabase
        .from('cmms_equipamentos')
        .insert([{ nome: eqNome.trim(), marca_modelo: eqMarca.trim(), localizacao: eqLocal.trim() }]);
      
      if (error) throw error;

      setEqNome(''); setEqMarca(''); setEqLocal('');
      setStatus(`Ativo clínico "${eqNome}" catalogado com sucesso.`);
      fetchInitialData();
    } catch (err: any) {
      console.error('Erro de execução:', err);
      setStatus(`Erro operacional: ${err.message || 'Falha ao salvar registro físico.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // OPERAÇÃO 2: Salvar Tarefa de Manutenção Periódica vinculada ao Ativo (Dentro do Modal)
  const handleSaveManutencaoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipamento || !mNome.trim()) {
      alert('Especifique o nome do procedimento preventivo.');
      return;
    }
    setIsProcessing(true);
    setStatus('Vinculando nova rotina técnica ao prontuário do ativo...');
    try {
      // 1. Inserir a rotina vinculada ao id do ativo aberto
      const { data: newMan, error: manErr } = await supabase
        .from('cmms_manutencoes_periodicas')
        .insert([{
          equipamento_id: selectedEquipamento.id,
          nome: mNome.trim(),
          frequencia_dias: parseInt(mFreq) || 180,
          data_ultima_execucao: mUltimaExec
        }])
        .select()
        .single();

      if (manErr) throw manErr;

      // 2. Inserir os passos associados caso existam
      const passosFiltrados = passosInput.map(p => p.trim()).filter(p => p !== '');
      if (passosFiltrados.length > 0) {
        const payload = passosFiltrados.map((descricao, index) => ({
          manutencao_id: newMan.id,
          ordem_passo: index + 1,
          descricao
        }));
        const { error: passosErr } = await supabase.from('cmms_passos_manutencao').insert(payload);
        if (passosErr) throw passosErr;
      }

      setMNome(''); setMFreq('180'); setPassosInput(['']);
      setStatus('Nova rotina de manutenção calculada e acoplada ao ativo.');
      fetchInitialData();
    } catch (err: any) {
      console.error('Erro ao acoplar rotina:', err);
      alert(`Falha na inserção técnica: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // OPERAÇÃO 3: Cadastrar Insumo de Almoxarifado
  const handleSaveInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insNome.trim()) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('cmms_insumos').insert([{
        nome: insNome.trim(),
        quantidade_atual: parseInt(insQtdAtual) || 0,
        quantidade_minima: parseInt(insQtdMin) || 0
      }]);
      if (error) throw error;
      setInsNome(''); setInsQtdAtual('5'); setInsQtdMin('2');
      setStatus(`Insumo técnico "${insNome}" integrado ao estoque.`);
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      setStatus('Falha ao catalogar insumo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // OPERAÇÃO 4: Deletar Ativo em Cascata
  const handleDeleteEquipamento = async (id: string, nome: string) => {
    if (!confirm(`ATENÇÃO CRÍTICA: Deseja excluir permanentemente o equipamento "${nome}" e TODAS as suas manutenções e checklists vinculados?`)) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('cmms_equipamentos').delete().eq('id', id);
      if (error) throw error;
      setStatus('Ativo e dependências removidos da infraestrutura.');
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao expurgar equipamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  // OPERAÇÃO 5: Deletar uma tarefa específica dentro do Modal
  const handleDeleteManutencaoEspecifica = async (id: string) => {
    if (!confirm('Deseja excluir esta rotina específica de manutenção periódica?')) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('cmms_manutencoes_periodicas').delete().eq('id', id);
      if (error) throw error;
      setStatus('Rotina técnica excluída do prontuário do ativo.');
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir rotina técnica.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      
      {/* CABEÇALHO DO ECOSSISTEMA CMMS */}
      <header className="mb-12 text-left">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2 uppercase italic text-left">
          Orion <span className="text-blue-600 not-italic">CMMS</span>
        </h1>
        <p className="text-slate-500 font-medium text-left">Controle de Ativos Clínicos e Engenharia de Manutenção • AC Odontologia</p>
      </header>

      {/* SEÇÃO 1: CADASTRO RÁPIDO E ISOLADO DE EQUIPAMENTO */}
      <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-10 text-left">
        <div 
          onClick={() => setIsFormExpanded(!isFormExpanded)}
          className="p-6 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
             {isFormExpanded ? <ChevronUp className="text-blue-600" size={20} /> : <ChevronDown className="text-blue-600" size={20} />}
             <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">
               {isFormExpanded ? 'Recolher Inclusão Primária' : 'Cadastrar Novo Equipamento Clínico'}
             </span>
          </div>
          <Wrench size={16} className="text-slate-300" />
        </div>

        {isFormExpanded && (
          <form onSubmit={handleSaveEquipamento} className="p-8 animate-in slide-in-from-top-4 duration-300 text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Ativo / Equipamento *</label>
                <input type="text" value={eqNome} onChange={e => setEqNome(e.target.value)} placeholder="Ex: Compressor Isento de Óleo" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Marca / Modelo</label>
                <input type="text" value={eqMarca} onChange={e => setEqMarca(e.target.value)} placeholder="Ex: Schulz MSV 12 / Gnatus" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Localização Física Interna</label>
                <input type="text" value={eqLocal} onChange={e => setEqLocal(e.target.value)} placeholder="Ex: Sala Técnica, Consultório 02" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end border-t border-slate-50 pt-4">
              <button 
                type="submit" 
                disabled={isProcessing}
                className="bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 flex items-center gap-2 hover:bg-slate-800 disabled:bg-slate-100 transition-all shadow-xl cursor-pointer"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                Cadastrar Equipamento
              </button>
            </div>
          </form>
        )}
      </section>

      {/* MONITOR DE STATUS DA MESA OPERACIONAL */}
      <div className="flex items-center gap-3 mb-10 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left">
        {isProcessing ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <Activity size={18} className="text-blue-500" />}
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{status}</p>
      </div>

      {/* SEÇÃO 2: ÁRVORE E LISTA DE EQUIPAMENTOS CADASTRADOS */}
      <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden mb-10 text-left">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
          <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Inventário de Ativos Físicos da Clínica
          </span>
        </div>

        {equipamentos.length === 0 ? (
          <div className="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum equipamento clínico cadastrado em banco.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Identificação do Equipamento</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Marca / Modelo</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Localização</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Ações de Engenharia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {equipamentos.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-900 uppercase text-xs">{eq.nome}</td>
                    <td className="p-6 text-slate-600 text-xs font-medium uppercase">{eq.marca_modelo || 'Não Informado'}</td>
                    <td className="p-6 text-slate-500 text-xs font-bold uppercase">{eq.localizacao || 'Geral'}</td>
                    <td className="p-6 flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setSelectedEquipamento(eq)}
                        className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Settings size={12} /> Gerenciar Rotinas
                      </button>
                      <button 
                        onClick={() => handleDeleteEquipamento(eq.id, eq.nome)}
                        className="p-2 border border-slate-200 text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 rounded-xl transition-all cursor-pointer"
                        title="Expurgar Ativo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SEÇÃO 3: CRONOGRAMA TÁTICO GLOBAL (LINHA DO TEMPO) */}
      <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden mb-10 text-left">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
          <Calendar size={14} className="text-blue-600" />
          <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Linha do Tempo Regulatória e de Preventivas (Geral da Clínica)
          </span>
        </div>

        {manutencoesGlobais.length === 0 ? (
          <div className="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhuma tarefa técnica parametrizada em nenhum ativo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Ativo / Local</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Rotina Preventiva</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Próxima Execução</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Status Crítico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {manutencoesGlobais.map((m) => {
                  const isVencido = m.diasRestantes <= 0;
                  const [ano, mes, dia] = m.proxima_execucao.split('-');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-6">
                        <div className="font-bold text-slate-900 uppercase text-xs">{m.cmms_equipamentos?.nome}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{m.cmms_equipamentos?.localizacao}</div>
                      </td>
                      <td className="p-6">
                        <div className="font-bold text-slate-700 text-xs flex items-center gap-1.5 uppercase">{m.nome}</div>
                        {m.cmms_passos_manutencao && m.cmms_passos_manutencao.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {m.cmms_passos_manutencao.map((p: any) => (
                              <span key={p.id} className="bg-slate-50 border border-slate-200 rounded px-1 text-[9px] font-mono text-slate-500" title={p.descricao}>
                                ST-{p.ordem_passo}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-center font-bold text-xs text-slate-900">{`${dia}/${mes}/${ano}`}</td>
                      <td className="p-6 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isVencido ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isVencido ? `Atrasada há ${Math.abs(m.diasRestantes)} dias` : `Em dia (${m.diasRestantes} dias rest.)`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SEÇÃO 4: ALMOXARIFADO TÉCNICO (INSUMOS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm text-left h-fit">
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-4">
            <Box size={14} className="text-blue-600" /> Catalogar Insumo / Periférico
          </span>
          <form onSubmit={handleSaveInsumo} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Insumo *</label>
              <input type="text" value={insNome} onChange={e => setInsNome(e.target.value)} placeholder="Ex: Pilha AA Fotopolimerizador" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estoque Atual</label>
                <input type="number" value={insQtdAtual} onChange={e => setInsQtdAtual(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estoque Mínimo</label>
                <input type="number" value={insQtdMin} onChange={e => setInsQtdMin(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] py-3 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all cursor-pointer">
              Adicionar ao Inventário
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100">
            <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Almoxarifado de Peças e Insumos Periféricos</span>
          </div>
          {insumos.length === 0 ? (
            <div className="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Almoxarifado vazio.</div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/10 border-b border-slate-100 text-slate-400">
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider">Item Técnico</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-center">Quantidade</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {insumos.map((item) => {
                    const isCritico = item.quantidade_atual <= item.quantidade_minima;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-bold text-slate-800 uppercase text-xs">{item.nome}</td>
                        <td className="p-4 text-center font-mono font-black text-xs text-slate-900">{item.quantidade_atual} UN</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${
                            isCritico ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {isCritico ? 'Comprar Urgente' : 'Estoque Saudável'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --- POPUP MODAL TÁTICO: GESTÃO DE ROTINAS DO ATIVO SELECIONADO --- */}
      {selectedEquipamento && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col text-left">
            
            {/* Header do Modal */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6 text-left">
              <div className="text-left">
                <h3 className="font-black text-xl text-slate-900 uppercase italic flex items-center gap-2">
                  <Settings size={20} className="text-blue-600" /> Prontuário Técnico do Ativo
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                  {selectedEquipamento.nome} • {selectedEquipamento.marca_modelo || 'SEM MARCA'} — Mód. Local: {selectedEquipamento.localizacao || 'GERAL'}
                </p>
              </div>
              <button onClick={() => { setSelectedEquipamento(null); setMNome(''); setPassosInput(['']); }} className="p-2 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
                <XCircle size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto flex-1 pr-1 text-left">
              
              {/* Painel Esquerdo: Lista de rotinas atuais atreladas a este ativo */}
              <div className="space-y-4 text-left">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 border-b pb-1">
                  Rotinas de Manutenção Ativas
                </span>
                
                {manutencoesDoAtivoSelecionado.length === 0 ? (
                  <div className="py-12 bg-slate-50 rounded-2xl text-center text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    Nenhuma rotina preventiva configurada para este item.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {manutencoesDoAtivoSelecionado.map((m) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-start text-left">
                        <div className="space-y-1 text-left">
                          <p className="font-black text-xs text-slate-900 uppercase tracking-wide">{m.nome}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Frequência: A cada {m.frequencia_dias} dias</p>
                          <p className="text-[10px] font-bold text-blue-600 uppercase">Próxima: {m.proxima_execucao.split('-').reverse().join('/')}</p>
                          
                          {m.cmms_passos_manutencao && m.cmms_passos_manutencao.length > 0 && (
                            <div className="pt-2 space-y-1 text-left">
                              <span className="block text-[9px] font-black text-slate-400 uppercase">Procedimento Operacional:</span>
                              {m.cmms_passos_manutencao.map((p: any) => (
                                <p key={p.id} className="text-[10px] text-slate-600 font-medium pl-2 border-l border-slate-200">
                                  <span className="font-mono text-slate-400 font-bold">{p.ordem_passo}.</span> {p.descricao}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteManutencaoEspecifica(m.id)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel Direito: Formulário de Nova Rotina */}
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 text-left h-fit">
                <span className="block text-[10px] font-black uppercase tracking-wider text-blue-600 border-b border-blue-100 pb-1 mb-4">
                  Acoplar Nova Rotina Técnico-Operacional
                </span>
                <form onSubmit={handleSaveManutencaoItem} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Procedimento *</label>
                    <input type="text" value={mNome} onChange={e => setMNome(e.target.value)} placeholder="Ex: Limpeza e Esterilização de Filtros" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Freq. (Dias)</label>
                      <input type="number" value={mFreq} onChange={e => setMFreq(e.target.value)} placeholder="180" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Última Execução</label>
                      <input type="date" value={mUltimaExec} onChange={e => setMUltimaExec(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none" />
                    </div>
                  </div>

                  {/* Checklist Dinâmico interno do formulário do Modal */}
                  <div className="flex flex-col text-left pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700">Etapas do Passo a Passo</label>
                      <button type="button" onClick={handleAddPassoRow} className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-0.5 hover:underline">
                        <Plus size={10} /> Adicionar Passo
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {passosInput.map((passo, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{idx + 1}.</span>
                          <input type="text" value={passo} onChange={e => handlePassoChange(idx, e.target.value)} placeholder="Instrução técnica..." className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none" />
                          {passosInput.length > 1 && (
                            <button type="button" onClick={() => handleRemovePassoRow(idx)} className="p-2 text-slate-300 hover:text-red-500">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="w-full mt-4 bg-slate-900 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-md transition-all cursor-pointer">
                    Salvar e Configurar Agenda
                  </button>
                </form>
              </div>

            </div>

            {/* Footer do Modal */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end">
              <button onClick={() => { setSelectedEquipamento(null); setMNome(''); setPassosInput(['']); }} className="bg-slate-100 text-slate-500 hover:bg-slate-200 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer">
                Fechar Prontuário
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}