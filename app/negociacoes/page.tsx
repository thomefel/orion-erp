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
  CheckCircle2,
  Users,
  Trash2 // Importação utilizada para os botões de expurgo
} from 'lucide-react';

export default function NegociacoesPage() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [patientsData, setPatientsData] = useState<Record<string, string>>({}); // Mapa de contatos
  const [consolidatedData, setConsolidatedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false); // Estado de processamento de limpeza em massa
  const [status, setStatus] = useState('Aguardando arquivos para iniciar a consolidação...');
  const [isImportExpanded, setIsImportExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [fileStates, setFileStates] = useState({
    finance: { loaded: false, name: '' },
    patients: { loaded: false, name: '' }
  });

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
          celular: item.celular,
          contato_desatualizado: item.contato_desatualizado, // Coluna acoplada para monitoramento de higienização
          notificacao_amigavel: item.notificacao_amigavel,
          proposta_enviada: item.proposta_enviada,
          notificacao_extrajudicial: item.notificacao_extrajudicial,
          notificacao_rtd: item.notificacao_rtd, // Acoplamento dinâmico para controle de notificação cartorária
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

  const formatPhone = (phone: any) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('55')) cleaned = `55${cleaned}`;
    return cleaned;
  };

  const getFaseBadge = (item: any) => {
    if (item.judicializado) return { label: 'Judicializado', classes: 'bg-slate-900 text-white border-slate-950 font-black' };
    if (item.protesto_realizado) return { label: 'Protestado', classes: 'bg-red-50 text-red-700 border-red-200' };
    if (item.confissao_assinada) return { label: 'Confissão Assinada', classes: 'bg-violet-50 text-violet-700 border-violet-200' };
    if (item.acordo_firmado) return { label: 'Acordo Firmado', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (item.notificacao_rtd) return { label: 'Notificação RTD', classes: 'bg-orange-50 text-orange-700 border-orange-200' };
    if (item.notificacao_extrajudicial) return { label: 'Notif. Simples', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
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
    setFileStates(prev => ({ ...prev, finance: { loaded: true, name: file.name } }));
    
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
      setStatus('Base financeira processada. Importe agora a lista de pacientes.');
    };
    reader.readAsBinaryString(file);
  };

  const handlePatientsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileStates(prev => ({ ...prev, patients: { loaded: true, name: file.name } }));

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 'A' });
      const contactsMap: Record<string, string> = {};
      data.forEach((row) => {
        const cpf = String(row.D || '').replace(/\D/g, '');
        if (cpf) contactsMap[cpf] = formatPhone(row.E);
      });
      setPatientsData(contactsMap);
      setStatus(`Lista de contatos carregada. Pronto para realizar a agregação.`);
    };
    reader.readAsBinaryString(file);
  };

  const handleConsolidate = () => {
    if (rawData.length === 0 || Object.keys(patientsData).length === 0) {
      setStatus('Erro crítico: Forneça a Base Financeira e a Lista de Pacientes antes de consolidar.');
      return;
    }
    setIsProcessing(true);
    setStatus('Realizando skip tracing interno e agrupando parcelas por CPF...');
    
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
              parcelasQtd: 1,
              celular: patientsData[item.cpf] || '',
              contato_desatualizado: false,
              notificacao_rtd: false
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
      setStatus(`Consolidação concluída localmente: ${result.length} contratos auditados.`);
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
        valor_total: item.valorTotal,
        celular: item.celular || null
      }));

      const { error } = await supabase
        .from('devedores_historicos')
        .upsert(payload, { onConflict: 'cpf' });

      if (error) throw error;

      setStatus('SUCESSO: Base histórica e canais de contato protegidos com RLS.');
      setIsImportExpanded(false);
    } catch (err: any) {
      console.error("Erro Supabase:", err);
      setStatus(`Erro na sincronização: ${err.message || 'Falha na conexão com banco'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- MOTOR TÁTICO DE EXPURGO DA BASE HISTÓRICA DE TESTE ---
  const handleClearDatabase = async () => {
    const confirmClear = confirm("ATENÇÃO MÁXIMA: Deseja apagar TODOS os registros históricos de negociação da nuvem? Esta ação é imediata, irreversível e limpará completamente o painel.");
    if (!confirmClear) return;

    setIsClearing(true);
    setStatus('Expurgando registros da base de dados remota...');
    try {
      const { error } = await supabase
        .from('devedores_historicos')
        .delete()
        .neq('cpf', '000.000.000-00');

      if (error) throw error;

      setStatus('SUCESSO: Base histórica remota limpa com sucesso.');
      setConsolidatedData([]);
      setRawData([]);
      setFileStates({
        finance: { loaded: false, name: '' },
        patients: { loaded: false, name: '' }
      });
    } catch (err: any) {
      console.error(err);
      setStatus(`Erro ao limpar base: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsClearing(false);
    }
  };

  // --- MOTOR EXCLUSIVO PARA HIGIENIZAÇÃO INDIVIDUAL ITEM A ITEM ---
  const handleDeleteSingle = async (cpf: string) => {
    const confirmDelete = confirm("Deseja realmente remover permanentemente este devedor da nuvem?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('devedores_historicos')
        .delete()
        .eq('cpf', cpf);

      if (error) throw error;

      setConsolidatedData(prev => prev.filter(item => item.cpf !== cpf));
      setStatus('Registro individual higienizado com sucesso.');
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao excluir registro: ${err.message || 'Falha de comunicação'}`);
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
               {isImportExpanded ? 'Recolher Painel de Importação' : 'Importação de Base Histórica'}
             </span>
          </div>
          {!isImportExpanded && <Database size={16} className="text-slate-300" />}
        </div>

        {isImportExpanded && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`relative group transition-all duration-300 bg-white p-6 rounded-3xl border-2 border-dashed ${fileStates.finance.loaded ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 hover:border-blue-400'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${fileStates.finance.loaded ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    <Database size={24} />
                  </div>
                  <div className="flex-1 text-left truncate">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Base Financeira Histórica</label>
                    <p className="text-[11px] text-slate-400 truncate">{fileStates.finance.name || 'Selecionar planilha de débitos'}</p>
                    <input type="file" accept=".xlsx" onChange={handleFileLoad} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className={`relative group transition-all duration-300 bg-white p-6 rounded-3xl border-2 border-dashed ${fileStates.patients.loaded ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-emerald-400'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${fileStates.patients.loaded ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    <Users size={24} />
                  </div>
                  <div className="flex-1 text-left truncate">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lista de Pacientes (Contatos)</label>
                    <p className="text-[11px] text-slate-400 truncate">{fileStates.patients.name || 'Selecionar planilha de contatos'}</p>
                    <input type="file" accept=".xlsx" onChange={handlePatientsUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-left">
              <button 
                onClick={handleConsolidate}
                disabled={!fileStates.finance.loaded || !fileStates.patients.loaded || isProcessing}
                className="flex-1 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl active:scale-95 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileSearch size={18} />}
                Iniciar Agregação
              </button>
              
              <div className="flex-1 flex gap-3 w-full">
                <button 
                  onClick={saveToSupabase}
                  disabled={consolidatedData.length === 0 || isSyncing}
                  className="flex-1 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl active:scale-95 cursor-pointer"
                >
                  {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <CloudUpload size={18} />}
                  Salvar na Nuvem
                </button>

                <button 
                  onClick={handleClearDatabase}
                  disabled={isClearing}
                  className="bg-red-600 text-white px-5 rounded-2xl font-black flex items-center justify-center hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl active:scale-95 cursor-pointer"
                  title="Limpar toda a base histórica remota"
                >
                  {isClearing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 mb-10 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left">
        {isProcessing || isSyncing || isClearing ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <AlertCircle size={18} className="text-blue-500" />}
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
                                
                                {/* Badge tático adicional para sinalizar interrupção de canal por contato inválido */}
                                {item.contato_desatualizado && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider bg-orange-50 text-orange-700 border-orange-200 animate-pulse">
                                    Sem Contato
                                  </span>
                                )}
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
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/negociacoes/${item.cpf}`}>
                              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group/btn active:scale-95 cursor-pointer">
                              Ações <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                              </button>
                          </Link>
                          <button 
                            onClick={() => handleDeleteSingle(item.cpf)}
                            className="inline-flex items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Higienizar registro da lista"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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