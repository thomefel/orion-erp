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

  // Novo Estado para rascunhos de edição (sem salvar no banco imediatamente)
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }, ...prev]);
  };

  const calcularDiferencaDias = (dataVencimento: string) => {
    if (!dataVencimento) return 0;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const parts = dataVencimento.split('-');
    const venc = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    venc.setHours(0, 0, 0, 0);
    return Math.round((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => { fetchFila(); }, []);

  async function fetchFila() {
    setLoading(true);
    addLog("Sincronizando régua de cobrança...", "info");
    const { data } = await supabase.from('devedores_ativos').select('*').neq('status_cobranca', 'descartado');
    if (data) {
      const elegiveis = data.filter(item => {
        const diff = calcularDiferencaDias(item.data_vencimento);
        const gatilhoHoje = `D${diff >= 0 ? '+' : ''}${diff}`;
        return [-2, 0, 1, 5, 10, 15].includes(diff) && item.ultimo_gatilho !== gatilhoHoje;
      });
      setFila(elegiveis);
      addLog(`${elegiveis.length} registros pendentes hoje.`, "success");
    }
    setLoading(false);
  }

  const getMensagemFormatada = (item: any) => {
    // 1. Prioridade para o rascunho local (que o utilizador está a digitar agora)
    if (draftMessages[item.cpf] !== undefined) return draftMessages[item.cpf];
    
    // 2. Segunda prioridade para o que está no banco de dados
    if (item.mensagem_personalizada) return item.mensagem_personalizada;
    
    // 3. Terceira prioridade para o script da régua
    const diff = calcularDiferencaDias(item.data_vencimento);
    const parts = item.data_vencimento.split('-');
    const dataFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const nome = item.nome.split(' ')[0];
    const script = SCRIPTS_COBRANCA[diff] || SCRIPTS_COBRANCA[15];
    return script.replace('{nome}', nome).replace('{dataFmt}', dataFmt);
  };

  // MECANISMO DE SALVAMENTO MANUAL (Ícone de Disquete)
  const salvarMensagemManual = async (cpf: string) => {
    const textoParaSalvar = draftMessages[cpf];
    if (textoParaSalvar === undefined) return;

    setIsSaving(cpf);
    const { error } = await supabase
      .from('devedores_ativos')
      .update({ mensagem_personalizada: textoParaSalvar })
      .eq('cpf', cpf);
    
    if (!error) {
      addLog(`Alterações salvas para o CPF ${cpf}`, "success");
      // Atualiza a fila local para refletir que o banco agora tem este valor
      setFila(prev => prev.map(f => f.cpf === cpf ? { ...f, mensagem_personalizada: textoParaSalvar } : f));
    } else {
      addLog("Erro ao guardar no banco de dados.", "error");
    }
    setIsSaving(null);
  };

  // --- MOTOR DE AUTOPILOTO ---
  useEffect(() => {
    let timer: any;
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
    addLog("Autopiloto ligado.", "info");
  };

  const processarProximoDaFila = async () => {
    if (filaQueue.length === 0) {
      setIsAutopilotoActive(false); setCountdown(null);
      addLog("Régua de hoje concluída.", "success");
      return;
    }
    const sucesso = await dispararMensagem(filaQueue[0], true);
    if (sucesso) {
      const novaFila = filaQueue.slice(1);
      setFilaQueue(novaFila);
      if (novaFila.length > 0) { setCountdown(300); addLog("Aguardando 5 min...", "info"); }
    } else {
      setIsAutopilotoActive(false);
    }
  };

  // 🛡️ LÓGICA DE ENVIO COM SANITIZAÇÃO PÓS-SUCESSO
  const realizarChamadaApi = async (numero: string, texto: string) => {
    let numLimpo = numero.replace(/\D/g, '');
    if (numLimpo.length > 0 && !numLimpo.startsWith('55')) {
      numLimpo = '55' + numLimpo;
    }

    try {
      const res = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_TOKEN },
        body: JSON.stringify({ number: numLimpo, text: texto, delay: 1200 })
      });
      return { ok: res.ok, status: res.status, data: await res.json(), numUsado: numLimpo };
    } catch (e) {
      return { ok: false, status: 500, data: null, numUsado: numLimpo };
    }
  };

  const dispararMensagem = async (item: any, viaAutopiloto = false) => {
    if (!viaAutopiloto) setSendingId(item.cpf);
    const msgFinal = getMensagemFormatada(item);
    const diff = calcularDiferencaDias(item.data_vencimento);
    const gatilhoNome = `D${diff >= 0 ? '+' : ''}${diff}`;
    
    addLog(`Tentativa 1: ${item.nome}`, "info");

    let result = await realizarChamadaApi(item.celular, msgFinal);
    let sucessoTotal = false;

    if (result.ok) {
      sucessoTotal = true;
    } else if (result.status === 400) {
      const errorStr = JSON.stringify(result.data).toLowerCase();
      if (errorStr.includes('"exists":false') || errorStr.includes('not exists')) {
        addLog("Número inexistente. Tentando inversão do 9º dígito...", "error");
        let numAlt = result.numUsado.length === 13 
          ? result.numUsado.slice(0, 4) + result.numUsado.slice(5) 
          : result.numUsado.slice(0, 4) + '9' + result.numUsado.slice(4);

        addLog(`Tentativa 2 (${numAlt})...`, "info");
        const result2 = await realizarChamadaApi(numAlt, msgFinal);
        if (result2.ok) sucessoTotal = true;
      }
    }

    if (sucessoTotal) {
      // SANITIZAÇÃO: Limpamos a mensagem personalizada após o envio
      await supabase
        .from('devedores_ativos')
        .update({ 
          ultimo_gatilho: gatilhoNome,
          mensagem_personalizada: null // Reset para o próximo ciclo
        })
        .eq('cpf', item.cpf);
      
      // Limpa também o rascunho local
      setDraftMessages(prev => {
        const next = { ...prev };
        delete next[item.cpf];
        return next;
      });

      setFila(prev => prev.filter(f => f.cpf !== item.cpf));
      addLog(`Sucesso e Sanitização concluída: ${item.nome}`, "success");
      if (!viaAutopiloto) setSendingId(null);
      return true;
    } else {
      addLog(`Falha definitiva: ${item.nome}`, "error");
      if (!viaAutopiloto) setSendingId(null);
      return false;
    }
  };

  const descartarMensagem = async (item: any) => {
    if (!confirm(`Anular régua para ${item.nome}?`)) return;
    await supabase.from('devedores_ativos').update({ status_cobranca: 'descartado' }).eq('cpf', item.cpf);
    setFila(prev => prev.filter(f => f.cpf !== item.cpf));
    addLog(`${item.nome} removido.`, "info");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8">
      <header className="flex justify-between items-center mb-12">
        <div className="text-left text-slate-900">
          <h1 className="text-4xl font-black tracking-tighter italic">ORION <span className="text-blue-600 not-italic">COMMAND</span></h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Sanitization Engine v1.7.5</p>
        </div>
        <div className="flex gap-4">
          {!isAutopilotoActive ? (
            <button onClick={iniciarAutopiloto} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 shadow-xl transition-all">
              <Play size={16} fill="white" /> Enviar Tudo
            </button>
          ) : (
            <button onClick={() => setIsAutopilotoActive(false)} className="bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-red-600 shadow-xl transition-all">
              <Pause size={16} fill="white" /> Pausar
            </button>
          )}
          <button onClick={fetchFila} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-lg hover:bg-slate-50 transition-all">
            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4 text-left">
          {fila.length === 0 && !loading ? (
            <div className="bg-white rounded-[32px] p-24 text-center border border-slate-100 shadow-sm">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400" />
                <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Tudo em dia!</p>
            </div>
          ) : (
            fila.map((item) => (
              <div key={item.cpf} className={`bg-white rounded-[24px] border transition-all duration-300 overflow-hidden ${expandedCpf === item.cpf ? 'border-blue-500 shadow-2xl ring-1 ring-blue-500/10' : 'border-slate-100 shadow-sm'}`}>
                <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedCpf(expandedCpf === item.cpf ? null : item.cpf)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs">{item.nome.charAt(0)}</div>
                    <div>
                      <div className="font-black text-slate-900 text-sm uppercase">{item.nome}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.celular}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gatilho</div>
                        <div className="text-xs font-bold text-blue-600">D{calcularDiferencaDias(item.data_vencimento) >= 0 ? '+' : ''}{calcularDiferencaDias(item.data_vencimento)}</div>
                     </div>
                     {expandedCpf === item.cpf ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>

                {expandedCpf === item.cpf && (
                  <div className="px-6 pb-6 pt-2 bg-slate-50/30 border-t border-slate-50 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea 
                          className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 font-medium h-28 shadow-inner outline-none focus:ring-1 focus:ring-blue-200 pr-12"
                          value={getMensagemFormatada(item)}
                          onChange={(e) => setDraftMessages({...draftMessages, [item.cpf]: e.target.value})}
                        />
                        {/* BOTÃO SALVAR MANUAL (ÍCONE DE DISQUETE) */}
                        <button 
                          onClick={() => salvarMensagemManual(item.cpf)}
                          disabled={draftMessages[item.cpf] === undefined || isSaving === item.cpf}
                          className="absolute right-4 top-4 p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all disabled:opacity-0"
                          title="Salvar alteração no banco"
                        >
                          {isSaving === item.cpf ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-400 italic text-[10px]">
                          <Info size={12} /> Clique no disquete acima para fixar a edição.
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => descartarMensagem(item)} className="p-3 border border-slate-200 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={18} /></button>
                          <button disabled={sendingId === item.cpf} onClick={() => dispararMensagem(item)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg flex items-center gap-2">
                            {sendingId === item.cpf ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1 text-left">
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl sticky top-24 border border-slate-800 h-[600px] flex flex-col">
            <div className="flex items-center gap-3 text-blue-400 mb-8 border-b border-slate-800 pb-6">
              <Terminal size={20} />
              <span className="font-black text-xs uppercase tracking-widest italic text-left">Log Operacional</span>
            </div>
            {isAutopilotoActive && (
              <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
                <div className="text-blue-400 mb-2 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
                  <Clock size={12} /> Próximo em
                </div>
                <div className="text-3xl font-black text-white">{Math.floor(countdown! / 60)}:{(countdown! % 60).toString().padStart(2, '0')}</div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px] scrollbar-hide text-left">
              {logs.map((log, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${log.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : log.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>{log.msg}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}