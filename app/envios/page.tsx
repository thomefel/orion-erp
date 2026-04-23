// app/envios/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Send, MessageCircle } from 'lucide-react';

export default function EnviosPage() {
  const [fila, setFila] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFila() {
    setLoading(true);
    const { data } = await supabase
      .from('devedores_ativos')
      .select('*')
      .eq('status_cobranca', 'aguardando');
    
    if (data) setFila(data);
    setLoading(false);
  }

  useEffect(() => { fetchFila(); }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-slate-900">Controle de <span className="text-blue-600">Envios</span></h1>
        <button onClick={fetchFila} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
          <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {fila.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
            Nenhuma mensagem na fila para hoje.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400">Paciente</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400">Vencimento</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Ações de Disparo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fila.map((msg) => (
                <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-slate-800">{msg.nome}</div>
                    <div className="text-xs text-slate-500">{msg.celular}</div>
                  </td>
                  <td className="p-6 font-mono text-sm">{msg.data_vencimento}</td>
                  <td className="p-6 text-center">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto">
                      <Send size={16} /> Enviar Mensagem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}