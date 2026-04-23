'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { 
  Trash2, 
  CloudUpload, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Users, 
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';

export default function RecebiveisPage() {
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [patientsData, setPatientsData] = useState<Record<string, string>>({});
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [status, setStatus] = useState('Aguardando arquivos para iniciar a operação...');
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleCopyToClipboard = () => {
    if (combinedData.length === 0) return;
    
    const header = "*📋 RELATÓRIO DE AÇÕES - AC ODONTOLOGIA*\n";
    const divider = "====================================\n\n";
    
    const rows = combinedData.map(item => {
      const statusEmoji = item.statusInfo.label.startsWith('D+') ? '🔴' : '🟢';
      return `${statusEmoji} *${item.statusInfo.label}* | ${item.nome}\n` +
             `💰 *Valor:* R$ ${item.valor.toFixed(2)}\n` +
             `📅 *Vencimento Ref:* ${item.vencimento}\n` +
             `📱 *Contato:* ${item.celular}\n` +
             `------------------------------------`;
    }).join('\n');

    const textToCopy = `${header}${divider}${rows}\n\n_Gerado automaticamente pelo Orion ERP_`;
    
    navigator.clipboard.writeText(textToCopy);
    setStatus('CHECK: Relatório formatado copiado!');
    setTimeout(() => setStatus('Pronto para sincronizar com a nuvem.'), 3000);
  };

  const handleDeleteRow = (cpf: string) => {
    setCombinedData(combinedData.filter(item => item.cpf !== cpf));
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
        status_cobranca: 'aguardando'
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
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
            Módulo de <span className="text-blue-600">Recebíveis</span>
          </h1>
          <p className="text-slate-500 font-medium">Gestão de Inadimplência e Lembretes • AC Odontologia</p>
        </div>
      </header>

      {/* Seção Didática: Instruções de Exportação */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm">
          <h3 className="font-black text-blue-800 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
            <Info size={16} /> A. Como obter a Planilha Financeira
          </h3>
          <ol className="space-y-2 text-blue-900/70 font-semibold text-sm">
            <li className="flex gap-2"><span>1.</span> Acesse o Simples Dental</li>
            <li className="flex gap-2"><span>2.</span> Menu Financeiro {'>'} Recebíveis</li>
            <li className="flex gap-2"><span>3.</span> Filtre pelo mês atual (Situação: Pendente)</li>
            <li className="flex gap-2"><span>4.</span> Clique no botão Exportar (Excel)</li>
          </ol>
        </div>

        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
          <h3 className="font-black text-emerald-800 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
            <Info size={16} /> B. Como obter a Lista de Pacientes
          </h3>
          <ol className="space-y-2 text-emerald-900/70 font-semibold text-sm">
            <li className="flex gap-2"><span>1.</span> Acesse o Simples Dental</li>
            <li className="flex gap-2"><span>2.</span> Menu Pacientes</li>
            <li className="flex gap-2"><span>3.</span> Certifique-se de listar "Todos os Pacientes"</li>
            <li className="flex gap-2"><span>4.</span> Clique no botão Exportar (Excel)</li>
          </ol>
        </div>
      </section>

      {/* Seção de Uploads */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className={`relative group transition-all duration-300 bg-white p-8 rounded-3xl border-2 border-dashed ${fileStates.finance.loaded ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'} hover:cursor-grab active:cursor-grabbing`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${fileStates.finance.loaded ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <FileText size={28} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Planilha Financeira</label>
              <p className="text-xs text-slate-400 truncate">{fileStates.finance.name || 'Clique para selecionar o arquivo'}</p>
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
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Lista de Pacientes</label>
              <p className="text-xs text-slate-400 truncate">{fileStates.patients.name || 'Clique para selecionar o arquivo'}</p>
              <input type="file" accept=".xlsx" onChange={handlePatientsUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            {fileStates.patients.loaded && <CheckCircle2 className="text-emerald-500" size={24} />}
          </div>
        </div>
      </section>

      {/* Ações Principais */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <button 
          onClick={handlePrepareTable} 
          disabled={!fileStates.finance.loaded || !fileStates.patients.loaded}
          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 hover:cursor-grab"
        >
          Gerar Lista Filtrada
        </button>
        
        {combinedData.length > 0 && (
          <>
            <button 
              onClick={handleCopyToClipboard} 
              className="bg-amber-500 text-white py-4 px-8 rounded-2xl font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg hover:cursor-grab"
            >
              <Copy size={20} /> Copiar WhatsApp
            </button>
            <button 
              onClick={handleFinalSync} 
              disabled={isSyncing}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-blue-200 shadow-xl flex items-center justify-center gap-2 active:scale-95 hover:cursor-grab"
            >
              {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : <CloudUpload size={20} />}
              {isSyncing ? 'Sincronizando...' : 'Enviar para Cloud'}
            </button>
          </>
        )}
      </div>

      {/* Barra de Status */}
      <div className="flex items-center gap-3 mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <AlertCircle size={18} className="text-blue-500" />
        <p className="text-sm font-semibold text-slate-600">{status}</p>
      </div>

      {/* Tabela de Revisão */}
      {combinedData.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Paciente & CPF</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider text-center">Status</th>
                  <th className="p-6 text-[11px] font-black uppercase tracking-wider">Contato & Valor</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-center">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {combinedData.map((item) => (
                  <tr key={item.cpf} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-slate-800">{item.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{item.cpf}</div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${item.statusInfo?.color}`}>
                        {item.statusInfo?.label}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg w-fit group-hover:bg-white transition-colors">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {item.celular}
                      </div>
                      <div className="text-xs font-bold text-slate-500 mt-1 pl-1">R$ {item.valor.toFixed(2)}</div>
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