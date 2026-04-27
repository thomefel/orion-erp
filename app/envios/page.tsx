'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  RefreshCw, Send, MessageCircle, CheckCircle2, AlertTriangle, 
  Loader2, Info, Terminal, ChevronDown, ChevronUp, Save, Play, Pause, Clock, Trash2 
} from 'lucide-react';

const EVO_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
const EVO_INSTANCE = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || '';
const EVO_TOKEN = process.env.NEXT_PUBLIC_EVOLUTION_TOKEN || '';

// --- CONSTANTES DE MENSAGENS (RÉGUA AC ODONTOLOGIA) ---
const SCRIPTS_COBRANCA: Record<number, string> = {
  [-2]: "Olá, {nome}! Tudo bem? Passando para lembrar que sua parcela na AC Odontologia vence em 2 dias ({dataFmt}). Se precisar do boleto ou chave pix, é só avisar.",
  [0]: "Olá, {nome}! Tudo bem? Hoje é o dia do vencimento da sua parcela na AC Odontologia. Se já realizou o pagamento, pode desconsiderar! Caso precise de ajuda, estamos à disposição.",
  [1]: "Oi, {nome}! Notamos que sua parcela de {dataFmt} ainda não consta como paga no sistema. Pode ter sido um esquecimento, mas se precisar de um boleto ou chave pix, avise a gente!",
  [5]: "Olá, {nome}. Verificamos que sua parcela de {dataFmt} continua em aberto. Gostaríamos de saber se houve algum problema para que possamos te ajudar a regularizar.",
  [10]: "Bom dia, {nome}. Constatamos uma pendência de pagamento com 10 dias de atraso. Pedimos que entre em contato para regularizarmos sua situação e evitar cobranças formais.",
  [15]: "Prezado(a) {nome}. Tentamos contato anteriormente sobre o débito de {dataFmt}. Este é o último aviso do nosso sistema de alertas, precisamos resolver essa pendência o quanto antes, pois a partir de amanhã entrará para régua de cobrança judicial. Como podemos facilitar para você?"
};

export default function EnviosPage() {
  const [fila, setFila] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  
  const [expandedCpf, setExpandedCpf] = useState<string | null>(null);
  const [isAutopilotoActive, setIsAutopilotoActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [filaQueue, setFilaQueue] = useState<any[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }, ...prev]);
  };

  useEffect(() => { fetchFila(); }, []);

  async function fetchFila() {
    setLoading(true);
    addLog("Sincronizando pacientes elegíveis...", "info");
    
    const { data } = await supabase.from('devedores_ativos').select('*').eq('status_cobranca', 'aguardando');
    
    if (data) {
      // FILTRO INTELIGENTE: Apenas os dias exatos da régua
      const elegiveis = data.filter(item => {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const venc = new Date(item.data_vencimento); venc.setHours(0,0,0,0);
        const diff = Math.round((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
        return [-2, 0, 1, 5, 10, 15].includes(diff);
      });

      setFila(elegiveis);
      addLog(`${elegiveis.length} mensagens prontas para os gatilhos de hoje.`, "success");
    }
    setLoading(false);
  }

  const getMensagemFormatada = (item: any) => {
    // Se já houver mensagem personalizada salva no banco, usa ela
    if (item.mensagem_personalizada) return item.mensagem_personalizada;
    
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const venc = new Date(item.data_vencimento); venc.setHours(0,0,0,0);
    const diff = Math.round((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
    
    const nome = item.nome.split(' ')[0];
    const dataFmt = venc.toLocaleDateString('pt-BR');

    const script = SCRIPTS_COBRANCA[diff] || SCRIPTS_COBRANCA[15]; // Default para D+15 se algo falhar
    return script.replace('{nome}', nome).replace('{dataFmt}', dataFmt);
  };

  // Função para salvar a edição no banco de dados em tempo real
  const salvarEdicaoNoBanco = async (cpf: string, novoTexto: string) => {
    const { error } = await supabase
      .from('devedores_ativos')
      .update({ mensagem_personalizada: novoTexto })
      .eq('cpf', cpf);
    
    if (!error) {
      setFila(prev => prev.map(f => f.cpf === cpf ? { ...f, mensagem_personalizada: novoTexto } : f));
    }
  };

  // --- MOTOR DE AUTOPILOTO ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutopilotoActive && countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isAutopilotoActive && countdown === 0) {
      processarProximoDaFila();
    }
    return () => clearTimeout(timer);
  }, [isAutopilotoActive, countdown]);

  const iniciarAutopiloto = () => {
    if (fila.length === 0) return;
    setIsAutopilotoActive(true);
    setFilaQueue([...fila]);
    setCountdown(5);
    addLog("Autopiloto iniciado. Fila de disparos sequenciais.", "info");
  };

  const processarProximoDaFila = async () => {
    if (filaQueue.length === 0) {
      setIsAutopilotoActive(false);
      setCountdown(null);
      addLog("Todos os envios do dia concluídos.", "success");
      return;
    }
    const proximo = filaQueue[0];
    const sucesso = await dispararMensagem(proximo, true);
    if (sucesso) {
      const novaFila = filaQueue.slice(1);
      setFilaQueue(novaFila);
      if (novaFila.length > 0) {
        setCountdown(300); // 5 minutos
        addLog(`Intervalo de segurança ativado (5min).`, "info");
      }
    } else {
      setIsAutopilotoActive(false);
      addLog("Autopiloto pausado por erro.", "error");
    }
  };

  const dispararMensagem = async (item: any, viaAutopiloto = false) => {
    if (!viaAutopiloto) setSendingId(item.cpf);
    const msgFinal = getMensagemFormatada(item);
    
    addLog(`Conectando Evolution para: ${item.nome}`, "info");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_TOKEN },
        body: JSON.stringify({ number: item.celular, text: msgFinal, delay: 1200 }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        await supabase.from('devedores_ativos').update({ status_cobranca: 'enviado' }).eq('cpf', item.cpf);
        setFila(prev => prev.filter(f => f.cpf !== item.cpf));
        addLog(`Mensagem enviada: ${item.nome}`, "success");
        return true;
      }
      return false;
    } catch (err) {
      addLog(`Erro de conexão em ${item.nome}`, "error");
      return false;
    } finally {
      if (!viaAutopiloto) setSendingId(null);
    }
  };

  const descartarMensagem = async (item: any) => {
    if (!confirm(`Anular envio para ${item.nome}?`)) return;
    const { error } = await supabase.from('devedores_ativos').update({ status_cobranca: 'descartado' }).eq('cpf', item.cpf);
    if (!error) {
      setFila(prev => prev.filter(f => f.cpf !== item.cpf));
      addLog(`${item.nome} descartado da fila.`, "info");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">ORION <span className="text-blue-600 not-italic">COMMAND</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Automação AC Odontologia v1.6.3</p>
        </div>
        <div className="flex gap-4">
          {!isAutopilotoActive ? (
            <button 
              onClick={iniciarAutopiloto}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Play size={16} fill="white" /> Enviar Tudo
            </button>
          ) : (
            <button 
              onClick={() => setIsAutopilotoActive(false)}
              className="bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-red-600 transition-all shadow-xl shadow-red-100"
            >
              <Pause size={16} fill="white" /> Pausar
            </button>
          )}
          <button onClick={fetchFila} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-lg hover:bg-slate-50 transition-all">
            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          {fila.map((item) => (
            <div key={item.cpf} className={`bg-white rounded-[24px] border transition-all duration-300 overflow-hidden ${expandedCpf === item.cpf ? 'border-blue-500 shadow-2xl ring-1 ring-blue-500/10' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedCpf(expandedCpf === item.cpf ? null : item.cpf)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs">
                    {item.nome.charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-sm uppercase">{item.nome}</div>
                    <div className="text-[10px] font-mono text-slate-400">{item.celular}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right hidden sm:block">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimento</div>
                      <div className="text-xs font-bold text-slate-700">{new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</div>
                   </div>
                   {expandedCpf === item.cpf ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-slate-300" />}
                </div>
              </div>

              {expandedCpf === item.cpf && (
                <div className="px-6 pb-6 pt-2 bg-slate-50/30 border-t border-slate-50 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">Script {getMensagemFormatada(item).substring(0, 4)}...</label>
                      <textarea 
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all h-28 shadow-inner"
                        value={getMensagemFormatada(item)}
                        onChange={(e) => salvarEdicaoNoBanco(item.cpf, e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-slate-400 italic text-[10px] font-medium">
                        <Save size={12} /> Alterações são salvas automaticamente no banco de dados.
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => descartarMensagem(item)}
                          className="bg-white border border-slate-200 text-slate-400 p-3 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                          title="Anular"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button 
                          disabled={sendingId === item.cpf}
                          onClick={() => dispararMensagem(item)}
                          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                        >
                          {sendingId === item.cpf ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                          Enviar Agora
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* MONITOR */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl sticky top-24 border border-slate-800 h-[600px] flex flex-col">
            <div className="flex items-center gap-3 text-blue-400 mb-8 border-b border-slate-800 pb-6">
              <Terminal size={20} />
              <span className="font-black text-xs uppercase tracking-widest italic">Monitoramento</span>
            </div>

            {isAutopilotoActive && (
              <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
                <div className="text-blue-400 mb-2 font-black text-[10px] uppercase tracking-widest">Próximo Envio</div>
                <div className="text-4xl font-black text-white">{Math.floor(countdown! / 60)}:{(countdown! % 60).toString().padStart(2, '0')}</div>
                <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(countdown! / 300) * 100}%` }} />
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px] scrollbar-hide text-left">
              {logs.map((log, i) => (
                <div key={i} className={`p-4 rounded-2xl leading-relaxed border ${
                  log.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                  log.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}>
                  {log.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}