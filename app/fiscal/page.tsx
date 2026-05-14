'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Trash2, 
  Cloud, 
  RefreshCw,
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  FileText, 
  Users, 
  Save,
  XCircle,
  DatabaseZap,
  Search,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Tipagem para os registros locais
type LocalRecord = {
  id_temp: string;
  data_competencia: string;
  valor_servico: number;
  paciente_cpf: string;
  paciente_nome?: string;
  isValid: boolean;
  errorMsg?: string;
  origem?: string;
};

export default function FiscalPage() {
  const [codigoServico, setCodigoServico] = useState('04.12.01');
  const [aliquota, setAliquota] = useState('9.23');
  const [localData, setLocalData] = useState<LocalRecord[]>([]);
  const [cloudData, setCloudData] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pronto' | 'erro'>('todos');
  
  const [patientsMap, setPatientsMap] = useState<Record<string, string[]>>({}); 
  const [viewMode, setViewMode] = useState<'local' | 'cloud'>('local');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  const [fileStates, setFileStates] = useState({
    patients: { loaded: false, name: '' },
    inter: { loaded: false, name: '' },
    sicredi: { loaded: false, name: '' }
  });

  const cleanCPF = (cpf: any) => String(cpf || '').replace(/\D/g, '');
  const validateCPF = (cpf: string) => cpf.length === 11;

  const normalizeText = (text: string) => {
    return String(text || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/\s+/g, " ") 
      .trim()
      .toUpperCase();
  };

  const maskDate = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    if (v.length >= 3) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return v;
  };

  const toISO = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const fromISO = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getValidatedData = useCallback((dataToValidate: LocalRecord[]) => {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    return dataToValidate.map(item => {
      let errors = [];
      if (!validateCPF(item.paciente_cpf)) errors.push('CPF Inválido');
      if (item.valor_servico <= 0) errors.push('Valor nulo');
      if (!item.data_competencia || !dateRegex.test(item.data_competencia.trim())) errors.push('Data inválida');

      return {
        ...item,
        isValid: errors.length === 0,
        errorMsg: errors.join(' | ')
      };
    });
  }, []);

  const handleManualValidate = () => {
    setLocalData(prev => getValidatedData(prev));
  };

  useEffect(() => {
    const loadDraft = async () => {
      const { data, error } = await supabase
        .from('rascunhos_fiscal')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (!error && data && data.length > 0) {
        const formatted = data.map((d: any) => ({
          id_temp: d.id,
          data_competencia: fromISO(d.data_competencia),
          valor_servico: d.valor_servico,
          paciente_cpf: d.paciente_cpf,
          paciente_nome: d.paciente_nome,
          origem: d.origem,
          isValid: false 
        }));
        setLocalData(getValidatedData(formatted));
      }
      setIsLoadingDraft(false);
    };
    loadDraft();
  }, [getValidatedData]);

  const handleClearDraft = async () => {
    if (!confirm('Deseja apagar o rascunho salvo na nuvem?')) return;
    const { error } = await supabase.from('rascunhos_fiscal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) {
      setLocalData([]);
      setFileStates({
        patients: { ...fileStates.patients },
        inter: { loaded: false, name: '' },
        sicredi: { loaded: false, name: '' }
      });
    }
  };

  const handlePatientsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const mapping: Record<string, string[]> = {};
      json.forEach(row => {
        const nomeRaw = String(row.Paciente || row.Nome || row.A || '').trim();
        const cpfRaw = String(row.Documento || row.CPF || row.D || '').trim();
        if (!nomeRaw) return;
        const nomeNorm = normalizeText(nomeRaw);
        const cpf = cleanCPF(cpfRaw);
        if (!mapping[nomeNorm]) mapping[nomeNorm] = [];
        if (cpf && !mapping[nomeNorm].includes(cpf)) mapping[nomeNorm].push(cpf);
      });
      setPatientsMap(mapping);
      setFileStates(prev => ({ ...prev, patients: { loaded: true, name: file.name } }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFormattedUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const extracted: LocalRecord[] = json.map((row: any, index) => ({
        id_temp: `formatted_${Date.now()}_${index}`,
        data_competencia: row.Data || '',
        valor_servico: Number(row.Valor) || 0,
        paciente_cpf: cleanCPF(row.CPF || ''),
        paciente_nome: row.Paciente || 'IMPORTADO',
        origem: 'Planilha Formatada',
        isValid: false,
      }));
      setLocalData(prev => getValidatedData([...prev, ...extracted]));
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleInterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r?\n/);
      const extracted: LocalRecord[] = lines.map((line, index) => {
        const cols = line.split(';');
        if (cols.length < 4) return null;
        
        const histNorm = normalizeText(String(cols[1]));
        const isFaturamento = histNorm.includes('RECEBIDO') && (histNorm.includes('PIX') || histNorm.includes('BOLETO'));
        
        if (!isFaturamento) return null;
        
        const nomeBruto = String(cols[2]).trim();
        const nomeNorm = normalizeText(nomeBruto);
        if (nomeNorm.includes('AC ODONTOLOGIA')) return null;

        const valorLimpo = Number(cols[3].replace('.', '').replace(',', '.'));
        const cpfsEncontrados = patientsMap[nomeNorm] || [];
        let cpfFinal = 'NAO ENCONTRADO';
        if (cpfsEncontrados.length === 1) cpfFinal = cpfsEncontrados[0];

        return {
          id_temp: `inter_${Date.now()}_${index}`,
          data_competencia: cols[0].trim(),
          valor_servico: Math.abs(valorLimpo),
          paciente_cpf: cpfFinal,
          paciente_nome: nomeBruto.toUpperCase(),
          origem: 'Inter PJ',
          isValid: false
        };
      }).filter(item => item !== null) as LocalRecord[];
      
      setLocalData(prev => getValidatedData([...prev, ...extracted]));
      setFileStates(prev => ({ ...prev, inter: { loaded: true, name: file.name } }));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSicrediUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const extracted: LocalRecord[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items as any[];
          const rowGroups: Record<number, any[]> = {};
          items.forEach(item => {
            const y = Math.round(item.transform[5]);
            if (!rowGroups[y]) rowGroups[y] = [];
            rowGroups[y].push(item);
          });
          const sortedY = Object.keys(rowGroups).sort((a, b) => Number(b) - Number(a));
          sortedY.forEach(y => {
            const lineItems = rowGroups[Number(y)].sort((a, b) => a.transform[4] - b.transform[4]);
            const fullLine = lineItems.map(item => item.str).join(' ');
            if (fullLine.toUpperCase().includes('RECEBIMENTO PIX')) {
              const dateMatch = fullLine.match(/(\d{2}\/\d{2}\/\d{4})/);
              const valueMatch = fullLine.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
              const descMatch = fullLine.match(/RECEBIMENTO PIX\s+(?:SICREDI\s+)?(\d{11})\s+(.*?)(?:\s+PIX_CRED|PIX_CRE|PIX CRED|\d{9}|$)/i);
              if (dateMatch && valueMatch && descMatch) {
                const nomeExtraido = descMatch[2].trim().toUpperCase();
                if (normalizeText(nomeExtraido).includes('AC ODONTOLOGIA')) return;
                extracted.push({
                  id_temp: `sicredi_${Date.now()}_${extracted.length}`,
                  data_competencia: dateMatch[1],
                  valor_servico: Number(valueMatch[1].replace(/\./g, '').replace(',', '.')),
                  paciente_cpf: descMatch[1],
                  paciente_nome: nomeExtraido,
                  origem: 'Sicredi PDF',
                  isValid: false
                });
              }
            }
          });
        }
        setLocalData(prev => getValidatedData([...prev, ...extracted]));
        setFileStates(prev => ({ ...prev, sicredi: { loaded: true, name: file.name } }));
      };
      reader.readAsArrayBuffer(file);
    } catch (err) { console.error("Erro ao carregar motor de PDF."); }
  };

  const handleAddManual = () => {
    const newRow: LocalRecord = {
      id_temp: `manual_${Date.now()}`,
      data_competencia: '',
      valor_servico: 0,
      paciente_cpf: '',
      paciente_nome: 'ENTRADA MANUAL',
      origem: 'Manual',
      isValid: false
    };
    setLocalData(prev => [newRow, ...prev]);
  };

  const handleUpdateField = (id: string, field: keyof LocalRecord, value: any) => {
    setLocalData(prev => prev.map(item => {
      if (item.id_temp === id) {
        let finalValue = value;
        if (field === 'data_competencia') finalValue = maskDate(value);
        const updated = { ...item, [field]: finalValue };
        return getValidatedData([updated])[0];
      }
      return item;
    }));
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await supabase.from('rascunhos_fiscal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const payload = localData.map(item => ({
        data_competencia: toISO(item.data_competencia),
        valor_servico: item.valor_servico,
        paciente_cpf: item.paciente_cpf,
        paciente_nome: item.paciente_nome,
        codigo_servico: codigoServico,
        aliquota_simples: Number(aliquota),
        origem: item.origem
      }));
      await supabase.from('rascunhos_fiscal').insert(payload);
    } catch (err) { console.error('Erro ao salvar rascunho.'); }
    setIsSavingDraft(false);
  };

  const handleSendToCloud = async () => {
    if (localData.length === 0) return;
    const payload = localData.map(item => ({
      data_competencia: toISO(item.data_competencia),
      valor_servico: item.valor_servico,
      paciente_cpf: item.paciente_cpf,
      codigo_servico: codigoServico,
      aliquota_simples: Number(aliquota),
      status: 'pendente'
    }));
    const { error: insertError } = await supabase.from('lotes_emissao_nfe').insert(payload);
    if (!insertError) {
      await supabase.from('rascunhos_fiscal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setLocalData([]);
      setViewMode('cloud');
    }
  };

  const loadFromCloud = useCallback(async () => {
    const { data } = await supabase.from('lotes_emissao_nfe').select('*').order('created_at', { ascending: false });
    if (data) setCloudData(data);
  }, []);

  const clearCloud = async () => {
    if (!confirm('Limpar toda a fila da nuvem?')) return;
    const { error } = await supabase.from('lotes_emissao_nfe').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) loadFromCloud();
  };

  useEffect(() => {
    if (viewMode === 'cloud') loadFromCloud();
  }, [viewMode, loadFromCloud]);

  const canSend = localData.length > 0 && localData.every(i => i.isValid);

  const filteredLocalData = useMemo(() => {
    const term = normalizeText(searchTerm);
    return localData.filter(item => {
      const matchesSearch = !term || 
        normalizeText(item.paciente_nome || '').startsWith(term) || 
        item.paciente_cpf.toUpperCase().startsWith(term);

      const matchesStatus = statusFilter === 'todos' || 
        (statusFilter === 'pronto' && item.isValid) || 
        (statusFilter === 'erro' && !item.isValid);

      return matchesSearch && matchesStatus;
    });
  }, [localData, searchTerm, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="flex justify-between items-end">
        <div className="text-left">
          <h1 className="text-4xl font-black text-slate-900 italic uppercase">
            Orion <span className="text-violet-600 not-italic">Fiscal</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Extração de Extratos e Gestão de Notas • AC Odontologia</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button onClick={() => setViewMode('local')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${viewMode === 'local' ? 'bg-white shadow text-violet-600' : 'text-slate-50'}`}>Preparação</button>
          <button onClick={() => setViewMode('cloud')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${viewMode === 'cloud' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Fila RPA</button>
        </div>
      </header>

      {viewMode === 'local' && (
        <div className="space-y-8 mt-8 text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`relative p-6 rounded-3xl border-2 border-dashed transition-all ${fileStates.patients.loaded ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-400'}`}>
              <Users className={fileStates.patients.loaded ? 'text-emerald-500' : 'text-slate-300'} size={32} />
              <p className="text-xs font-black uppercase mt-2">1. Lista de Pacientes</p>
              <input id="xlsx-up" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePatientsUpload} accept=".xlsx, .csv" />
            </div>
            <div className={`relative p-6 rounded-3xl border-2 border-dashed transition-all ${!fileStates.patients.loaded ? 'opacity-50 grayscale cursor-not-allowed' : fileStates.inter.loaded ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400'}`}>
              <FileSpreadsheet className={fileStates.inter.loaded ? 'text-blue-500' : 'text-slate-300'} size={32} />
              <p className="text-xs font-black uppercase mt-2">2. Extrato Inter (CSV)</p>
              <input id="input-inter" type="file" disabled={!fileStates.patients.loaded} className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleInterUpload} accept=".csv" />
            </div>
            <div className={`relative p-6 rounded-3xl border-2 border-dashed transition-all ${fileStates.sicredi.loaded ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-200 hover:border-orange-400'}`}>
              <FileText className={fileStates.sicredi.loaded ? 'text-orange-500' : 'text-slate-300'} size={32} />
              <p className="text-xs font-black uppercase mt-2">3. Extrato Sicredi (PDF)</p>
              <input id="input-sicredi" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleSicrediUpload} accept=".pdf" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end text-left">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Código do Serviço</label>
              <input type="text" value={codigoServico} onChange={e => setCodigoServico(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Alíquota %</label>
              <input type="text" value={aliquota} onChange={e => setAliquota(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveDraft} disabled={isSavingDraft} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all cursor-pointer"><Save size={20} /> Salvar Rascunho</button>
              <button onClick={handleClearDraft} className="bg-red-50 text-red-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 border border-red-100 cursor-pointer"><XCircle size={20} /> Apagar Rascunho</button>
              <button onClick={handleSendToCloud} disabled={!canSend} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canSend ? 'bg-violet-600 text-white shadow-lg cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}><Cloud size={20} /> Enviar p/ Emissão</button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Listagem de Emissão</h3>
               <button onClick={handleManualValidate} className="text-[10px] font-black text-violet-600 uppercase flex items-center gap-1 hover:underline cursor-pointer"><RefreshCw size={14} /> Re-verificar tudo</button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 text-left">Origem / Status</th>
                  <th className="px-6 py-4 min-w-[300px] text-left">Paciente / CPF</th>
                  <th className="px-6 py-4 text-left">Data</th>
                  <th className="px-6 py-4 text-left">Valor (R$)</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {isLoadingDraft ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Carregando rascunhos...</td></tr>
                ) : filteredLocalData.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum registro encontrado.</td></tr>
                ) : filteredLocalData.map((item) => (
                  <tr key={item.id_temp} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-black text-slate-300 uppercase">{item.origem}</span>
                        {item.isValid ? <span className="text-emerald-600 font-bold uppercase text-[10px]">PRONTO</span> : <span className="text-red-500 font-bold uppercase text-[10px]" title={item.errorMsg}>ERRO</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="text-xs font-black text-slate-900 mb-1 uppercase">{item.paciente_nome}</div>
                      <input type="text" value={item.paciente_cpf} onChange={e => handleUpdateField(item.id_temp, 'paciente_cpf', cleanCPF(e.target.value))} className={`bg-slate-50 px-2 py-1 rounded border w-full text-xs font-mono ${item.paciente_cpf === 'NAO ENCONTRADO' ? 'border-red-300 text-red-500 font-black' : 'border-slate-100'}`} />
                    </td>
                    <td className="px-6 py-4 text-left"><input type="text" value={item.data_competencia} onChange={e => handleUpdateField(item.id_temp, 'data_competencia', e.target.value)} className="bg-transparent border-b border-dashed w-24 outline-none" /></td>
                    <td className="px-6 py-4 text-left"><input type="number" value={item.valor_servico} onChange={e => handleUpdateField(item.id_temp, 'valor_servico', Number(e.target.value))} className="bg-transparent font-bold w-24 outline-none" /></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setLocalData(prev => prev.filter(i => i.id_temp !== item.id_temp))} className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors"><Trash2 size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-slate-50/50 flex justify-center gap-6 border-t border-slate-100">
              <button onClick={handleAddManual} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-violet-600 uppercase tracking-tighter cursor-pointer"><Plus size={16} /> Incluir nova entrada manual</button>
              <label htmlFor="formatted-xlsx" className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-emerald-600 uppercase tracking-tighter cursor-pointer"><FileSpreadsheet size={16} /> Importar Planilha Formatada</label>
              <input id="formatted-xlsx" type="file" className="hidden" accept=".xlsx" onChange={handleFormattedUpload} />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'cloud' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8 text-left">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Fila de Emissão na Nuvem</h3>
            <button onClick={clearCloud} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1 cursor-pointer"><Trash2 size={14} /> Limpar Tudo</button>
          </div>
          <div className="overflow-x-auto text-left">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-left">CPF</th>
                  <th className="px-6 py-4 text-left">Data</th>
                  <th className="px-6 py-4 text-center">Valor</th>
                  <th className="px-6 py-4 text-left">Serviço/Alíquota</th>
                </tr>
              </thead>
              <tbody>
                {cloudData.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Fila vazia.</td></tr>
                ) : cloudData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                    <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${row.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{row.status}</span></td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-left">{row.paciente_cpf}</td>
                    <td className="px-6 py-4 text-slate-500 text-left">{fromISO(row.data_competencia)}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-center">R$ {Number(row.valor_servico).toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium text-left">{row.codigo_servico} | {row.aliquota_simples}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-12 text-left">
            <div className="text-right">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Notas</span>
              <span className="text-2xl font-black text-slate-900">{cloudData.length}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</span>
              <span className="text-2xl font-black text-violet-600">R$ {cloudData.reduce((acc, row) => acc + (Number(row.valor_servico) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}