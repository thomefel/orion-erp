// app/supervisor/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bot, 
  Clock, 
  Save, 
  MessageSquare, 
  UserCheck, 
  UserX, 
  Loader2, 
  Info, 
  Zap, 
  ZapOff,
  History,
  TrendingDown
} from 'lucide-react';

export default function SupervisorPage() {
  const [config, setConfig] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Sincronizando central de inteligência artificial...');

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  // Busca as configurações globais da IA com tratamento auto-curativo
  async function fetchConfig() {
    setLoadingConfig(true);
    try {
      // Alterado de .single() para .maybeSingle() para evitar a quebra caso a tabela tenha 0 linhas
      const { data, error } = await supabase
        .from('ia_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro crítico detectado no Supabase:', error);
        setStatusMessage(`Erro ao carregar parâmetros: ${error.message}`);
      } else if (data) {
        // Se encontrou a configuração, alimenta o estado normalmente
        setConfig(data);
      } else {
        // Se data veio null (tabela vazia), o próprio sistema cria a primeira linha padrão automaticamente
        setStatusMessage('Nenhuma configuração localizada. Inicializando parâmetros baseline...');
        
        const { data: seededData, error: seedError } = await supabase
          .from('ia_config')
          .insert([{ status_bot: true }])
          .select()
          .maybeSingle();

        if (seededData) {
          setConfig(seededData);
          setStatusMessage('Configuração baseline inicializada com sucesso.');
        } else if (seedError) {
          console.error('Falha ao tentar criar registro padrão:', seedError);
          setStatusMessage('Tabela ia_config vazia. Por favor, execute o script no SQL Editor.');
        }
      }
    } catch (err) {
      console.error('Erro de runtime no componente:', err);
      setStatusMessage('Falha inesperada no processamento de dados da IA.');
    }
    setLoadingConfig(false);
  }

  // Busca a fila de logs de conversas noturnas recentes
  async function fetchLogs() {
    setLoadingLogs(true);
    const { data } = await supabase
      .from('ia_conversas_logs')
      .select('*')
      .order('data_interacao', { ascending: false });

    if (data) {
      setLogs(data);
    }
    setLoadingLogs(false);
  }

  // Atualiza os parâmetros globais no banco de dados
  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    setStatusMessage('Salvando diretrizes táticas na nuvem...');

    const { error } = await supabase
      .from('ia_config')
      .update({
        status_bot: config.status_bot,
        horario_inicio_rpa: config.horario_inicio_rpa,
        horario_fim_rpa: config.horario_fim_rpa,
        prompt_sistema: config.prompt_sistema,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);

    if (!error) {
      setStatusMessage('SUCESSO: Parâmetros e Playbook Operacional salvos com sucesso.');
      fetchConfig();
    } else {
      setStatusMessage('Erro crítico ao persistir as novas configurações.');
    }
    setSavingConfig(false);
  };

  // Força a IA a calar a boca ou reativar para um devedor/lead específico
  const handleToggleIntervention = async (log: any) => {
    setUpdatingLogId(log.id);
    const novoStatusIntervencao = !log.intervencao_humana;
    const novoStatusAtendimento = novoStatusIntervencao ? 'ASSUMIDO_HUMANO' : 'AQUECIDO';

    const { error } = await supabase
      .from('ia_conversas_logs')
      .update({
        intervencao_humana: novoStatusIntervencao,
        status_atendimento: novoStatusAtendimento,
        data_interacao: new Date().toISOString()
      })
      .eq('id', log.id);

    if (!error) {
      setLogs(prev => prev.map(item => 
        item.id === log.id 
          ? { ...item, intervencao_humana: novoStatusIntervencao, status_atendimento: novoStatusAtendimento } 
          : item
      ));
      setStatusMessage(`Status do canal de ${log.paciente_nome} alterado com sucesso.`);
    } else {
      alert('Falha ao registrar intervenção humana no banco.');
    }
    setUpdatingLogId(null);
  };

  if (loadingConfig) {
    return <div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase text-[10px] tracking-widest text-left">Carregando painel supervisor...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="mb-12 flex justify-between items-end text-left">
        <div className="text-left">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2 uppercase italic text-left">
            Orion <span className="text-blue-600 not-italic text-left">Supervisor</span>
          </h1>
          <p className="text-slate-500 font-medium text-left">Painel de Auditoria e Controle Tático de IA • AC Odontologia</p>
        </div>
      </header>

      {/* LINHA DE LOGS DE NOTIFICAÇÃO E STATUS EM TEMPO REAL */}
      <div className="flex items-center gap-3 mb-10 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left">
        {savingConfig ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <Info size={18} className="text-blue-500" />}
        <p className="text-sm font-bold text-slate-600 text-left">{statusMessage}</p>
      </div>

      {/* SEÇÃO 1: CONFIGURAÇÃO DE DIRETRIZES DO ATENDENTE VIRTUAL */}
      {config && (
        <section className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm mb-12 text-left">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-left">
            <Bot size={14} className="text-blue-600" /> Parâmetros de Automação do Robô Noturno
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-8 text-left">
            {/* Toggle de Ativação Master */}
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-28 text-left">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Status Geral do Robô</span>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-sm font-black uppercase ${config.status_bot ? 'text-emerald-600' : 'text-red-500'}`}>
                  {config.status_bot ? 'Ativo em Plantão' : 'Desativado Manual'}
                </span>
                <button 
                  onClick={() => setConfig({ ...config, status_bot: !config.status_bot })}
                  className={`p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer ${config.status_bot ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-red-500 text-white shadow-lg shadow-red-100'}`}
                >
                  {config.status_bot ? <Zap size={16} /> : <ZapOff size={16} />}
                </button>
              </div>
            </div>

            {/* Input de Horário Inicial */}
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-28 text-left">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-left flex items-center gap-1"><Clock size={12} /> Início da Contingência</span>
              <input 
                type="time" 
                value={config.horario_inicio_rpa?.substring(0, 5) || ''}
                onChange={(e) => setConfig({ ...config, horario_inicio_rpa: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 mt-2 font-bold text-slate-700 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Input de Horário Final */}
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-between h-28 text-left">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-left flex items-center gap-1"><Clock size={12} /> Fim da Contingência</span>
              <input 
                type="time" 
                value={config.horario_fim_rpa?.substring(0, 5) || ''}
                onChange={(e) => setConfig({ ...config, horario_fim_rpa: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 mt-2 font-bold text-slate-700 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Campo de Texto para Ajuste de Prompt do Sistema */}
          <div className="mb-8 text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left flex items-center gap-1">
              <MessageSquare size={12} className="text-blue-600" /> Diretrizes de Comportamento e Persona (System Instruction)
            </label>
            <textarea 
              value={config.prompt_sistema || ''}
              onChange={(e) => setConfig({ ...config, prompt_sistema: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm text-slate-700 font-medium h-36 outline-none focus:ring-2 focus:ring-blue-100 transition-all text-left leading-relaxed"
            />
          </div>

          {/* Botão de Persistência */}
          <div className="flex justify-end text-left">
            <button 
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {savingConfig ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Salvar Configurações da IA
            </button>
          </div>
        </section>
      )}

      {/* SEÇÃO 2: TABELA DE AUDITORIA E MONITORAMENTO DE CONVERSAS REAL-TIME */}
      <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden min-h-[300px] text-left">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 text-left">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 text-left">
            <History size={14} className="text-blue-600" /> Monitor de Conversas Recentes da IA
          </h3>
        </div>

        {loadingLogs ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="font-black text-slate-400 uppercase text-[10px] tracking-[0.3em]">Buscando logs de interações...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300 text-left">
             <TrendingDown size={48} className="mb-4 opacity-10" />
             <p className="font-bold uppercase tracking-widest text-xs text-left text-slate-400">Nenhuma conversa registrada fora do expediente até o momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-left">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-left">Paciente</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Última Interação</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Status de Linha</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Intervenção Manual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-left">
                {logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-blue-50/20 transition-colors text-left">
                    <td className="p-6 text-left">
                      <div className="text-left">
                        <div className="font-bold text-slate-900 uppercase text-sm text-left">{log.paciente_nome}</div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-tighter text-left">{log.paciente_whatsapp}</div>
                      </div>
                    </td>

                    <td className="p-6 text-center font-medium text-slate-600 text-sm">
                      {new Date(log.data_interacao).toLocaleString('pt-BR')}
                    </td>

                    <td className="p-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                        log.status_atendimento === 'ASSUMIDO_HUMANO' 
                          ? 'bg-slate-100 text-slate-500 border-slate-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      }`}>
                        {log.status_atendimento === 'ASSUMIDO_HUMANO' ? 'Assumido por Humano' : 'IA Ativa (Aquecido)'}
                      </span>
                    </td>

                    <td className="p-6 text-center">
                      <button
                        onClick={() => handleToggleIntervention(log)}
                        disabled={updatingLogId === log.id}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 cursor-pointer ${
                          log.intervencao_humana
                            ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600'
                        }`}
                      >
                        {updatingLogId === log.id ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : log.intervencao_humana ? (
                          <>
                            <UserX size={12} /> Devolver para o Robô
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} /> Assumir / Mutar Robô
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}