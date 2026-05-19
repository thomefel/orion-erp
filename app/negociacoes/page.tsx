'use client';
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link'; // Importação essencial para navegação
import { supabase } from '../lib/supabase';
import { 
  History, 
  FileSearch, 
  TrendingDown, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Database,
  Search,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  CheckCircle2
} from 'lucide-react';

export default function NegociacoesPage() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [consolidatedData, setConsolidatedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('Aguardando base histórica para análise...');
  const [isImportExpanded, setIsImportExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFromSupabase();
  }, []);

  async function fetchFromSupabase() {
    setIsProcessing(true);
    setStatus('Buscando registros salvos na nuvem...');
    
    const { data, error } = await supabase
      .from('devedores_historicos')
      .select('*')
      .order('valor_total', { ascending: false });

    if (data && data.length > 0) {
      const formatado = data.map(item => {
        const [ano, mes, dia] = item.data_divida.split('-').map(Number);
        const vencUTC = Date.UTC(ano, mes - 1, dia);
        const agora = new Date();
        const hojeUTC = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const dias = Math.round((hojeUTC - vencUTC) / (1000 * 60 * 60 * 24));

        return {
          cpf: item.cpf,
          nome: item.nome,
          valorTotal: item.valor_total,
          vencimentoMaisAntigo: `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`,
          diasAtraso: dias,
          parcelasQtd: item.parcelas_qtd,
          fase_atual: item.fase_atual,
          // Extração das chaves de progresso tático para a etiqueta de status
          notificacao_amigavel: item.notificacao_amigavel,
          proposta_enviada: item.proposta_enviada,
          notificacao_extrajudicial: item.notificacao_extrajudicial,
          acordo_firmado: item.acordo_firmado,
          confissao_assinada: item.confissao_assinada,
          protesto_realizado: item.protesto_realizado,
          judicializado: item.judicializado
        };
      });
      setConsolidatedData(formatado);
      setStatus(`${data.length} devedores carregados da nuvem.`);
      setIsImportExpanded(false);
    } else {
      setStatus('Nenhum registro encontrado na nuvem. Inicie uma nova importação.');
    }
    setIsProcessing(false);
  }

  // Lógica inteligente para determinar visualmente a fase operacional mais adiantada
  const getFaseBadge = (item: any) => {
    if (item.judicializado) return { label: 'Judicializado', classes: 'bg-slate-900 text-white border-slate-950 font-black' };
    if (item.protesto_realizado) return { label: 'Protestado', classes: 'bg-red-50 text-red-700 border-red-200' };
    if (item.confissao_assinada) return { label: 'Confissão Assinada', classes: 'bg-violet-50 text-violet-700 border-violet-200' };
    if (item.acordo_firmado) return { label: 'Acordo Firmado', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (item.notificacao_extrajudicial) return { label: 'Notif. Extrajudicial', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (item.proposta_enviada) return { label: 'Proposta Enviada', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (item.notificacao_amigavel) return { label: 'Abordagem Inicial', classes: 'bg-teal-50 text-teal-700 border-teal-200' };
    return { label: 'Sem Ações', classes: 'bg-slate-50 text-slate-400 border-slate-200' };
  };

  const normalizeText = (text: string) => {
    return String(text || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/\s+/g, " ") 
      .trim()
      .toUpperCase();
  };

  const filteredData = useMemo(() => {
    const term = normalizeText(searchTerm);
    return consolidatedData.filter(item => {
      return !term || 
        normalizeText(item.nome).includes(term) || 
        item.cpf.toUpperCase().includes(term);
    });
  }, [consolidatedData, searchTerm]);

  const parseBrazilianDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatToISODate = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const getDiffDays = (vencimentoStr: string) => {
    const dueDate = parseBrazilianDate(vencimentoStr);
    if (!dueDate) return 0;
    const vencUTC = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const agora = new Date();
    const hojeUTC = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
    return Math.round((hojeUTC - vencUTC) / (1000 * 60 * 60 * 24));
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 'A' });
      
      const filtered = data.filter((row: any) => 
        String(row.A).trim() === 'Receita' && String(row.J).trim() === 'Pendente'
      ).map((row: any) => ({
        nome: row.C,
        cpf: String(row.D || '').replace(/\D/g, ''),
        vencimento: row.F,
        valor: Number(row.H || 0)
      }));

      setRawData(filtered);
      setStatus('Arquivo carregado. Pronto para consolidação histórica.');
    };
    reader.readAsBinaryString(file);
  };

  const handleConsolidate = () => {
    setIsProcessing(true);
    setStatus('Agregando dívidas por CPF e calculando maturidade...');
    
    setTimeout(() => {
      const aggregated: Record<string, any> = {};

      rawData.forEach(item => {
        const diff = getDiffDays(item.vencimento);
        if (diff >= 60) {
          const chave = item.cpf && item.cpf !== '' ? item.cpf : `N/A-${item.nome.replace(/\s+/g, '').toLowerCase()}`;

          if (!aggregated[chave]) {
            aggregated[chave] = {
              ...item,
              cpf: chave, 
              valorTotal: item.valor,
              vencimentoMaisAntigo: item.vencimento,
              diasAtraso: diff,
              parcelasQtd: 1
            };
          } else {
            aggregated[chave].valorTotal += item.valor;
            aggregated[chave].parcelasQtd += 1;
            const dataAtualAntiga = parseBrazilianDate(aggregated[chave].vencimentoMaisAntigo);
            const novaDataPossivel = parseBrazilianDate(item.vencimento);
            if (novaDataPossivel && dataAtualAntiga && novaDataPossivel < dataAtualAntiga) {
              aggregated[chave].vencimentoMaisAntigo = item.vencimento;
              aggregated[chave].diasAtraso = diff;
            }
          }
        }
      });

      const result = Object.values(aggregated).sort((a: any, b: any) => b.valorTotal - a.valorTotal);
      setConsolidatedData(result);
      setIsProcessing(false);
      setStatus(`Consolidação concluída localmente: ${result.length} devedores identificados.`);
    }, 800);
  };

  const saveToSupabase = async () => {
    if (consolidatedData.length === 0) return;
    setIsSyncing(true);
    setStatus('Sincronizando dados com Orion Cloud...');

    try {
      const payload = consolidatedData.map(item => ({
        cpf: item.cpf, 
        nome: item.nome,
        data_divida: formatToISODate(item.vencimentoMaisAntigo),
        parcelas_qtd: item.parcelasQtd,
        valor_total: item.valorTotal
      }));

      const { error } = await supabase
        .from('devedores_historicos')
        .upsert(payload, { onConflict: 'cpf' });

      if (error) throw error;

      setStatus('SUCESSO: Base histórica salva e protegida com RLS.');
      setIsImportExpanded(false);
    } catch (err: any) {
      console.error("Erro Supabase:", err);
      setStatus(`Erro na sincronização: ${err.message || 'Falha na conexão com banco'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="mb-12 flex justify-between items-end text-left">
        <div className="text-left">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2 uppercase italic text-left">
            Orion <span className="text-blue-600 not-italic text-left">Negociação</span>
          </h1>
          <p className="text-slate-500 font-medium text-left">Gestão de Inadimplência Superior a 60 dias • AC Odontologia</p>
        </div>
      </header>

      <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-10 transition-all duration-500 text-left">
        <div 
          onClick={() => setIsImportExpanded(!isImportExpanded)}
          className="p-6 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
             {isImportExpanded ? <ChevronUp className="text-blue-600" size={20} /> : <ChevronDown className="text-blue-600" size={20} />}
             <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">
               {isImportExpanded ? 'Recolher Painel de Importação' : 'Nova Importação de Base Histórica'}
             </span>
          </div>
          {!isImportExpanded && <Database size={16} className="text-slate-300" />}
        </div>

        {isImportExpanded && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
            <div className="md:col-span-2 relative group transition-all duration-300 bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Database size={32} />
                </div>
                <div className="flex-1 text-left">
                  <label className="block text-sm font-bold text-slate-700 mb-1 text-left">Base Financeira Histórica</label>
                  <p className="text-xs text-slate-400 truncate text-left">{fileName || 'Selecione o Excel exportado do Simples Dental'}</p>
                  <input type="file" accept=".xlsx" onChange={handleFileLoad} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-left">
              <button 
                onClick={handleConsolidate}
                disabled={rawData.length === 0 || isProcessing}
                className="flex-1 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl active:scale-95 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileSearch size={18} />}
                Iniciar Agregação
              </button>
              
              <button 
                onClick={saveToSupabase}
                disabled={consolidatedData.length === 0 || isSyncing}
                className="flex-1 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl active:scale-95 cursor-pointer"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <CloudUpload size={18} />}
                Salvar na Nuvem
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 mb-10 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left">
        {isProcessing || isSyncing ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <AlertCircle size={18} className="text-blue-500" />}
        <p className="text-sm font-bold text-slate-600 text-left">{status}</p>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden min-h-[400px] text-left">
        {isProcessing && consolidatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <History className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
             </div>
             <p className="font-black text-slate-400 uppercase text-[10px] tracking-[0.3em] animate-pulse">Processando dados históricos...</p>
          </div>
        ) : consolidatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-slate-300 text-left">
             <TrendingDown size={64} className="mb-4 opacity-10" />
             <p className="font-bold uppercase tracking-widest text-xs text-left">Aguardando definição da base de devedores</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto text-left">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                    <th className="p-6 text-[11px] font-black uppercase tracking-wider text-left min-w-[300px]">
                      <div className="flex flex-col gap-2 text-left">
                        <span>Paciente / Ranking de Volume</span>
                        <div className="relative text-left">
                          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Filtrar por nome ou CPF..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Idade da Dívida</th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-wider text-left">Passivo Acumulado</th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-left">
                  {filteredData.map((item, idx) => (
                    <tr key={item.cpf || `nome-${idx}`} className="group hover:bg-blue-50/30 transition-colors text-left">
                      <td className="p-6 text-left">
                        <div className="flex items-center gap-4 text-left">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {idx + 1}
                           </div>
                           <div className="text-left">
                              {/* Integração sutil e elegante do Badge de Status ao lado do Nome */}
                              <div className="font-bold text-slate-900 uppercase text-sm text-left flex items-center gap-3">
                                <span>{item.nome}</span>
                                {(() => {
                                  const badge = getFaseBadge(item);
                                  return (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${badge.classes}`}>
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono tracking-tighter text-left">{item.cpf || 'CPF NÃO INFORMADO'}</div>
                           </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-100">
                          {item.diasAtraso} DIAS
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 font-bold uppercase text-center">Desde {item.vencimentoMaisAntigo}</div>
                      </td>
                      <td className="p-6 text-left">
                        <div className="text-lg font-black text-slate-900 text-left">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase italic text-left">{item.parcelasQtd} parcelas pendentes</div>
                      </td>
                      <td className="p-6 text-center">
                        <Link href={`/negociacoes/${item.cpf}`}>
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group/btn active:scale-95 cursor-pointer">
                            Ações <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-12 text-left">
              <div className="text-right">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total de Devedores</span>
                <span className="text-2xl font-black text-slate-900 text-right">{filteredData.length}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Montante Recuperável</span>
                <span className="text-2xl font-black text-blue-600 text-right">
                  R$ {filteredData.reduce((acc, item) => acc + (Number(item.valorTotal) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}