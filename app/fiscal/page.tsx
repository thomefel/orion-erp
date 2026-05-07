'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Upload, CheckCircle2, AlertCircle, Trash2, Cloud, RefreshCcw, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

type LocalRecord = {
  id_temp: string;
  data_competencia: string;
  valor_servico: number;
  paciente_cpf: string;
  isValid: boolean;
  errorMsg?: string;
};

export default function FiscalPage() {
  const [codigoServico, setCodigoServico] = useState('04.12.01');
  const [aliquota, setAliquota] = useState('9.23');
  const [localData, setLocalData] = useState<LocalRecord[]>([]);
  const [cloudData, setCloudData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'local' | 'cloud'>('local');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  // Limpeza e Validação de CPF
  const cleanCPF = (cpf: any) => String(cpf).replace(/\D/g, '');
  const validateCPF = (cpf: string) => cpf.length === 11;

  // 1. Processamento da Planilha
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const parsed: LocalRecord[] = json.map((row: any, index) => {
        const cpfLimpo = cleanCPF(row.CPF || '');
        return {
          id_temp: `temp_${Date.now()}_${index}`,
          data_competencia: row.Data || '',
          valor_servico: Number(row.Valor) || 0,
          paciente_cpf: cpfLimpo,
          isValid: false,
        };
      });

      setLocalData(parsed);
      validateAll(parsed);
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset input
  };

  // 2. Verificação Sistêmica
  const validateAll = (dataToValidate: LocalRecord[] = localData) => {
    const verified = dataToValidate.map(item => {
      let errors = [];
      if (!validateCPF(item.paciente_cpf)) errors.push('CPF Inválido (11 dígitos)');
      if (item.valor_servico <= 0) errors.push('Valor nulo/negativo');
      if (!item.data_competencia) errors.push('Data ausente');

      return {
        ...item,
        isValid: errors.length === 0,
        errorMsg: errors.join(' | ')
      };
    });
    setLocalData(verified);
  };

  // 3. Edição e Correção
  const handleUpdateField = (id: string, field: keyof LocalRecord, value: any) => {
    setLocalData(prev => prev.map(item => item.id_temp === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteRow = (id: string) => {
    setLocalData(prev => prev.filter(item => item.id_temp !== id));
  };

  // 4. Operações de Nuvem
  const loadFromCloud = async () => {
    setIsLoadingCloud(true);
    const { data, error } = await supabase
      .from('lotes_emissao_nfe')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setCloudData(data);
    setIsLoadingCloud(false);
  };

  const handleSendToCloud = async () => {
    const allValid = localData.every(i => i.isValid);
    if (!allValid) return alert('Existem erros pendentes na tabela local.');

    const payload = localData.map(item => ({
      data_competencia: item.data_competencia,
      valor_servico: item.valor_servico,
      paciente_cpf: item.paciente_cpf,
      codigo_servico: codigoServico,
      aliquota_simples: Number(aliquota),
      status: 'pendente'
    }));

    const { error } = await supabase.from('lotes_emissao_nfe').insert(payload);
    if (!error) {
      alert('Dados enviados para a nuvem com sucesso!');
      setLocalData([]);
      loadFromCloud();
      setViewMode('cloud');
    } else {
      alert(`Erro: ${error.message}`);
    }
  };

  const clearCloud = async () => {
    if (!confirm('Deseja realmente limpar toda a fila da nuvem?')) return;
    const { error } = await supabase.from('lotes_emissao_nfe').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) loadFromCloud();
  };

  useEffect(() => {
    if (viewMode === 'cloud') loadFromCloud();
  }, [viewMode]);

  const canSend = localData.length > 0 && localData.every(i => i.isValid);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Módulo Fiscal</h1>
          <p className="text-slate-500 mt-1">Gestão de lotes e emissão assistida.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={loadFromCloud}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw size={18} className={`text-blue-600 ${isLoadingCloud ? 'animate-spin' : ''}`} />
            Sincronizar Nuvem
          </button>

          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('local')} 
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'local' ? 'bg-white shadow text-violet-600' : 'text-slate-500'}`}
            >
              Preparação Local
            </button>
            <button 
              onClick={() => setViewMode('cloud')} 
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'cloud' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              Fila na Nuvem
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'local' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Código do Serviço</label>
              <input type="text" value={codigoServico} onChange={e => setCodigoServico(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Alíquota Simples %</label>
              <input type="text" value={aliquota} onChange={e => setAliquota(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div className="flex gap-3">
              <label htmlFor="xlsx-up" className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
                <FileSpreadsheet size={20} /> Importar Planilha
              </label>
              <input type="file" id="xlsx-up" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
              
              <button 
                onClick={handleSendToCloud}
                disabled={!canSend}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canSend ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Cloud size={20} /> Enviar para Nuvem
              </button>
            </div>
          </div>

          {localData.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  Dados em Staging <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{localData.length} itens</span>
                </h3>
                <button onClick={() => validateAll()} className="text-sm font-bold text-violet-600 hover:underline flex items-center gap-1">
                  <RefreshCcw size={14} /> Re-verificar tudo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">CPF Tomador</th>
                      <th className="px-6 py-4">Data Comp.</th>
                      <th className="px-6 py-4">Valor (R$)</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {localData.map((item) => (
                      <tr key={item.id_temp} className="border-b border-slate-50 group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          {item.isValid ? (
                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                              <CheckCircle2 size={18} /> <span className="text-xs">OK</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-500 font-bold" title={item.errorMsg}>
                              <AlertCircle size={18} /> <span className="text-[10px] max-w-[100px] truncate">{item.errorMsg}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={item.paciente_cpf} 
                            onChange={e => handleUpdateField(item.id_temp, 'paciente_cpf', cleanCPF(e.target.value))}
                            className={`bg-transparent border-b border-dashed focus:border-violet-500 outline-none w-full font-medium ${!item.isValid && item.errorMsg?.includes('CPF') ? 'text-red-600 border-red-300' : 'text-slate-700 border-slate-200'}`}
                          />
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          <input type="text" value={item.data_competencia} onChange={e => handleUpdateField(item.id_temp, 'data_competencia', e.target.value)} className="bg-transparent outline-none w-full border-b border-transparent focus:border-violet-500" />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          <input type="number" value={item.valor_servico} onChange={e => handleUpdateField(item.id_temp, 'valor_servico', Number(e.target.value))} className="bg-transparent outline-none w-full border-b border-transparent focus:border-violet-500" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteRow(item.id_temp)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 size={18} />
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
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Fila de Emissão na Nuvem</h3>
            <button onClick={clearCloud} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-all flex items-center gap-1">
              <Trash2 size={14} /> Limpar Tudo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">CPF</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Serviço/Alíquota</th>
                </tr>
              </thead>
              <tbody>
                {cloudData.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum registro encontrado na nuvem.</td></tr>
                ) : cloudData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${row.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{row.paciente_cpf}</td>
                    <td className="px-6 py-4 text-slate-500">{row.data_competencia}</td>
                    <td className="px-6 py-4 font-black text-slate-900">R$ {Number(row.valor_servico).toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium">{row.codigo_servico} | {row.aliquota_simples}%</td>
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