import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  // 1. Barreira de Segurança: Validação do token de autenticação via Header
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Acesso operacional não autorizado.' }, { status: 401 });
  }

  try {
    // 2. Cálculo Determinístico do Dia Seguinte (Forçando Fuso Horário de Brasília)
    const spTime = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const dataSP = new Date(spTime);
    const diaSeguinte = new Date(dataSP);
    diaSeguinte.setDate(dataSP.getDate() + 1);

    const yyyy = diaSeguinte.getFullYear();
    const mm = String(diaSeguinte.getMonth() + 1).padStart(2, '0');
    const dd = String(diaSeguinte.getDate()).padStart(2, '0');
    const tomorrowString = `${yyyy}-${mm}-${dd}`;

    // 3. Consulta Relacional de Rotinas Agendadas para Amanhã
    const { data: tarefas, error: queryErr } = await supabase
      .from('cmms_manutencoes_periodicas')
      .select(`
        id,
        nome,
        proxima_execucao,
        cmms_equipamentos ( nome, localizacao ),
        cmms_passos_manutencao ( id, ordem_passo, descricao )
      `)
      .eq('proxima_execucao', tomorrowString);

    if (queryErr) throw queryErr;

    if (!tarefas || tarefas.length === 0) {
      return NextResponse.json({ message: `Monitor CMMS: Nenhuma rotina agendada para ${tomorrowString}.` });
    }

    // 4. Parâmetros de Conexão da Evolution API e Destinatário
    const evoUrl = process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
    const evoInstance = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || '';
    const evoToken = process.env.NEXT_PUBLIC_EVOLUTION_TOKEN || '';
    const targetNumber = process.env.CLINIC_ALERT_NUMBER || '';

    if (!evoUrl || !evoInstance || !evoToken || !targetNumber) {
      return NextResponse.json({ error: 'Parâmetros de mensageria ausentes no ambiente.' }, { status: 500 });
    }

    // 5. Processamento e Formatação das Mensagens em Lote
    let totalEnviados = 0;

    for (const tarefa of (tarefas as any[])) {
      // Técnica de extração segura: valida se o retorno técnico foi empacotado como Array ou Objeto Puro
      const eqData = Array.isArray(tarefa.cmms_equipamentos) 
        ? tarefa.cmms_equipamentos[0] 
        : tarefa.cmms_equipamentos;

      const eqNome = eqData?.nome || 'ATIVO DESCONHECIDO';
      const eqLocal = eqData?.localizacao || 'GERAL';
      const passos = tarefa.cmms_passos_manutencao || [];

      // Montagem do payload textual seguindo o padrão institucional rigoroso Orion
      let textMessage = `⚠️ *ORION CMMS • CRONOGRAMA DE PREVENTIVAS* ⚠️\n\n`;
      textMessage += `*ATIVO:* ${eqNome.toUpperCase()}\n`;
      textMessage += `*SETOR/LOCAL:* ${eqLocal.toUpperCase()}\n`;
      textMessage += `*MANUTENÇÃO PROGRAMADA PARA AMANHÃ:* ${tarefa.nome.toUpperCase()}\n\n`;

      if (passos.length > 0) {
        textMessage += `*PROCEDIMENTO OPERACIONAL PADRÃO (POP):*\n`;
        passos.sort((a: any, b: any) => a.ordem_passo - b.ordem_passo).forEach((p: any) => {
          textMessage += `${p.ordem_passo}. ${p.descricao.toUpperCase()}\n`;
        });
      } else {
        textMessage += `*ALERTA:* SEM CHECKLIST TÉCNICO VINCULADO NO PRONTUÁRIO.\n`;
      }

      textMessage += `\n_Módulo Orion CMMS • Rigor Formal e Compliance Operacional_`;

      // Disparo HTTP síncrono para o barramento da Evolution API
      const response = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evoToken
        },
        body: JSON.stringify({
          number: targetNumber,
          options: {
            delay: 1200,
            presence: 'composing'
          },
          textMessage: {
            text: textMessage
          }
        })
      });

      if (response.ok) totalEnviados++;
    }

    return NextResponse.json({ 
      success: true, 
      dateTarget: tomorrowString, 
      processedAlerts: totalEnviados 
    });

  } catch (err: any) {
    console.error('Falha crítica no motor de cron do CMMS:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no barramento cron.' }, { status: 500 });
  }
}