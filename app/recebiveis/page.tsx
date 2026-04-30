'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { 
  Trash2, 
  CloudUpload, 
  CheckCircle2, 
  FileText, 
  Users, 
  AlertCircle,
  RefreshCw,
  Info,
  DatabaseZap // Novo ícone para limpeza
} from 'lucide-react';

export default function RecebiveisPage() {
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [patientsData, setPatientsData] = useState<Record<string, string>>({});
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [status, setStatus] = useState('Aguardando arquivos para iniciar a operação...');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false); // Estado para o botão de limpar

  const [fileStates, setFileStates] = useState({
    finance: { loaded: false, name: '' },
    patients: { loaded: false, name: '' }
  });

  const formatPhone = (phone: any) => {
    let cleaned = String(phone).replace(/\D/g, ''); 
    if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('55')) cleaned = `55${cleaned}`;
    return cleaned;
  };

  const parseBrazilianDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatToISODate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const getDebtStatus = (vencimentoStr: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = parseBrazilianDate(vencimentoStr);
    if (!dueDate) return { label: '', color: '', show: false };
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return { label: `D+${diffDays}`, color: 'bg-red-50 text-red-700 border-red-200', show: true };
    } else {
      const label = diffDays === 0 ? 'D-0' : `D${diffDays}`;
      return { label: label, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', show: true };
    }
  };

  const handleFinanceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        cpf: String(row.D).replace(/\D/g, ''),
        vencimento: row.F,
        valor: row.H
      }));
      setFinanceData(filtered);
      setStatus('Financeiro processado. Importe a lista de pacientes.');
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
        const cpf = String(row.D).replace(/\D/g, '');
        if (cpf) contactsMap[cpf] = formatPhone(row.E);
      });
      setPatientsData(contactsMap);
      setStatus(`Lista de pacientes carregada.`);
    };
    reader.readAsBinaryString(file);
  };

  const handlePrepareTable = () => {
    if (financeData.length === 0 || Object.keys(patientsData).length === 0) {
      setStatus('Erro: Carregue ambos os arquivos antes de gerar a lista.');
      return;
    }

    const aggregated: Record<string, any> = {};

    financeData.forEach(item => {
      if (!aggregated[item.cpf]) {
        aggregated[item.cpf] = { ...item, valorTotal: Number(item.valor) };
      } else {
        aggregated[item.cpf].valorTotal += Number(item.valor);
        const currentVenc = parseBrazilianDate(aggregated[item.cpf].vencimento);
        const nextVenc = parseBrazilianDate(item.vencimento);
        if (nextVenc && currentVenc && nextVenc < currentVenc) {
            aggregated[item.cpf].vencimento = item.vencimento;
        }
      }
    });

    const allowedStatuses = ['D-2', 'D-0', 'D+1', 'D+3', 'D+5', 'D+10', 'D+15'];

    const merged = Object.values(aggregated).map(divida => ({
      ...divida,
      valor: divida.valorTotal,
      celular: patientsData[divida.cpf] || 'NÃO ENCONTRADO',
      statusInfo: getDebtStatus(divida.vencimento)
    })).filter(item => {
        return allowedStatuses.includes(item.statusInfo.label);
    });

    setCombinedData(merged);
    setStatus(`Filtro aplicado: ${merged.length} registros identificados para ação.`);
  };

  const handleDeleteRow = (cpf: string) => {
    setCombinedData(combinedData.filter(item => item.cpf !== cpf));
  };

  // 🗑️ NOVA FUNCIONALIDADE: LIMPAR A BASE NO SUPABASE
  const handleClearDatabase = async () => {
    if (!confirm('ATENÇÃO: Você está prestes a apagar TODOS os registros de cobrança da nuvem. Esta ação não pode ser desfeita. Deseja continuar?')) return;
    
    setIsClearing(true);
    setStatus('Limpando base de dados remota...');

    try {
      // Deleta todos os registros da tabela devedores_ativos
      const { error } = await supabase
        .from('devedores_ativos')
        .delete()
        .neq('cpf', '0'); // Filtro dummy necessário para o Supabase permitir delete em massa

      if (error) throw error;

      setStatus('SUCESSO: A base de dados foi totalmente limpa.');
      setCombinedData([]);
    } catch (error: any) {
      console.error(error);
      setStatus(`Erro ao limpar base: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleFinalSync = async () => {
    if (combinedData.length === 0) return;
    setIsSyncing(true);
    setStatus('Iniciando comunicação com Orion Cloud...');
    
    try {
      const payload = combinedData.map(item => ({
        cpf: item.cpf,
        nome: item.nome,
        valor_pendente: item.valor,
        data_vencimento: formatToISODate(item.vencimento),
        celular: item.celular,
        status_cobranca: 'aguardando',
        mensagem_personalizada: null,
        ultimo_gatilho: null
      }));

      const { error } = await supabase.from('devedores_ativos').upsert(payload, { onConflict: 'cpf' });
      
      if (error) throw error;
      
      setStatus('SUCESSO: Base de lembretes e atrasos sincronizada.');
    } catch (error: any) {
      console.error(error);
      setStatus(`Erro técnico: ${error.message || 'Falha na conexão'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div className="text-left">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
            Módulo de <span className="text-blue-600">Recebíveis</span>
          </h1>
          <p className="text-slate-500 font-medium text-left">Gestão de Inadimplência e Lembretes • AC Odontologia</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-left">
        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm text-left">
          <h3 className="font-black text-blue-800 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
            <Info size={16} /> A. Como obter a Planilha Financeira
          </h3>
          <ol className="space-y-2 text-blue-900/70 font-semibold text-sm text-left">
            <li className="flex gap-2"><span>1.</span> Acesse o Simples Dental</li>
            <li className="flex gap-2"><span>2.</span> Menu Financeiro {'>'} Recebíveis</li>
            <li className="flex gap-2"><span>3.</span> Filtre pelo mês atual (Situação: Pendente)</li>
            <li className="flex gap-2"><span>4.</span> Clique no botão Exportar (Excel)</li>
          </ol>
        </div>

        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-sm text-left">
          <h3 className="font-black text-emerald-800 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
            <Info size={16} /> B. Como obter a Lista de Pacientes
          </h3>
          <ol className="space-y-2 text-emerald-900/70 font-semibold text-sm text-left">
            <li className="flex gap-2"><span>1.</span> Acesse o Simples Dental</li>
            <li className="flex gap-2"><span>2.</span> Menu Pacientes</li>
            <li className="flex gap-2"><span>3.</span> Certifique-se de listar "Todos os Pacientes"</li>
            <li className="flex gap-2"><span>4.</span> Clique no botão Exportar (Excel)</li>
          </ol>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-left">
        <div className={`relative group transition-all duration-300 bg-white p-8 rounded-3xl border-2 border-dashed ${fileStates.finance.loaded ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'} hover:cursor-grab active:cursor-grabbing`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${fileStates.finance.loaded ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <FileText size={28} />
            </div>
            <div className="flex-1 text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left">Planilha Financeira</label>
              <p className="text-xs text-slate-400 truncate text-left">{fileStates.finance.name || 'Clique para selecionar o arquivo'}</p>
              <input type="file" accept=".xlsx" onChange={handleFinanceUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            {fileStates.finance.loaded && <CheckCircle2 className="text-blue-500" size={24} />}
          </div>
        </div>

        <div className={`relative group transition-all duration-300 bg-white p-8 rounded-3xl border-2 border-dashed ${fileStates.patients.loaded ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-400'} hover:cursor-grab active:cursor-grabbing`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${fileStates.patients.loaded ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Users size={28} />
            </div>
            <div className="flex-1 text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left">Lista de Pacientes</label>
              <p className="text-xs text-slate-400 truncate text-left text-left">{fileStates.patients.name || 'Clique para selecionar o arquivo'}</p>
              <input type="file" accept=".xlsx" onChange={handlePatientsUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            {fileStates.patients.loaded && <CheckCircle2 className="text-emerald-500" size={24} />}
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <button 
          onClick={handlePrepareTable} 
          disabled={!fileStates.finance.loaded || !fileStates.patients.loaded}
          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 hover:cursor-grab"
        >
          Gerar Lista Filtrada
        </button>
        
        {/* BOTÃO DE LIMPEZA DA BASE (Substituindo o Copy WhatsApp) */}
        <button 
          onClick={handleClearDatabase} 
          disabled={isClearing}
          className="bg-red-500 text-white py-4 px-8 rounded-2xl font-bold hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg active:scale-95 hover:cursor-grab"
        >
          {isClearing ? <RefreshCw className="animate-spin" size={20} /> : <DatabaseZap size={20} />}
          {isClearing ? 'Limpando...' : 'Limpar a Base'}
        </button>

        <button 
          onClick={handleFinalSync} 
          disabled={isSyncing || combinedData.length === 0}
          className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-blue-200 shadow-xl flex items-center justify-center gap-2 active:scale-95 hover:cursor-grab disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
        >
          {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : <CloudUpload size={20} />}
          {isSyncing ? 'Sincronizando...' : 'Enviar para Cloud'}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-left">
        <AlertCircle size={18} className="text-blue-500" />
        <p className="text-sm font-semibold text-slate-600 text-left">{status}</p>
      </div>

      {combinedData.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-12 text-left">
          <div className="overflow-x-auto text-left">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-left">Paciente & CPF</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Status</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-left">Contato & Valor</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-center">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-left">
                {combinedData.map((item) => (
                  <tr key={item.cpf} className="group hover:bg-blue-50/30 transition-colors text-left">
                    <td className="p-6 text-left text-slate-900">
                      <div className="font-bold text-left">{item.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter text-left">{item.cpf}</div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${item.statusInfo?.color}`}>
                        {item.statusInfo?.label}
                      </span>
                    </td>
                    <td className="p-6 text-left">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg w-fit group-hover:bg-white transition-colors text-left">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {item.celular}
                      </div>
                      <div className="text-xs font-bold text-slate-500 mt-1 pl-1 text-left">R$ {item.valor.toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeleteRow(item.cpf)} 
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all hover:cursor-grab active:cursor-grabbing"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}