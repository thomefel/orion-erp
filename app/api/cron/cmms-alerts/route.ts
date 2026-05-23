import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request: Request) {
  // 1. Barreira de Segurança: Validação do token de autenticação via Header
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Acesso operacional não autorizado.' }, { status: 401 });
  }

  try {
    // 2. Cálculo Determinístico de Prazos (Forçando Fuso Horário de Brasília)
    const spTime = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const dataSP = new Date(spTime);

    // Formatação de Hoje
    const yyyyH = dataSP.getFullYear();
    const mmH = String(dataSP.getMonth() + 1).padStart(2, '0');
    const ddH = String(dataSP.getDate()).padStart(2, '0');
    const todayString = `${yyyyH}-${mmH}-${ddH}`;

    // Formatação de Amanhã
    const diaSeguinte = new Date(dataSP);
    diaSeguinte.setDate(dataSP.getDate() + 1);
    const yyyyA = diaSeguinte.getFullYear();
    const mmA = String(diaSeguinte.getMonth() + 1).padStart(2, '0');
    const ddA = String(diaSeguinte.getDate()).padStart(2, '0');
    const tomorrowString = `${yyyyA}-${mmA}-${ddA}`;

    // 3. Consulta Relacional: Gatilhos de Amanhã OU Prazos Menores/Iguais a Hoje (Atrasados)
    const { data: tarefas, error: queryErr } = await supabase
      .from('cmms_manutencoes_periodicas')
      .select(`
        id,
        nome,
        proxima_execucao,
        cmms_equipamentos ( nome, localizacao ),
        cmms_passos_manutencao ( id, ordem_passo, descricao )
      `)
      .or(`proxima_execucao.eq.${tomorrowString},proxima_execucao.lte.${todayString}`);

    if (queryErr) throw queryErr;

    if (!tarefas || tarefas.length === 0) {
      return NextResponse.json({ message: `Monitor CMMS: Nenhuma rotina agendada ou em atraso para monitoramento.` });
    }

    // 4. Parâmetros de Conexão da Evolution API e Destinatário
    const evoUrl = process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
    const evoInstance = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || '';
    const evoToken = process.env.NEXT_PUBLIC_EVOLUTION_TOKEN || '';
    const targetNumber = process.env.CLINIC_ALERT_NUMBER || '';

    if (!evoUrl || !evoInstance || !evoToken || !targetNumber) {
      return NextResponse.json({ error: 'Parâmetros de mensageria ausentes no ambiente.' }, { status: 500 });
    }

    // 5. Mapeamento e Preparação das Mensagens Paralelizadas (Técnica Promise.all)
    const promessasDeDisparo = (tarefas as any[]).map(async (tarefa) => {
      const eqData = Array.isArray(tarefa.cmms_equipamentos) 
        ? tarefa.cmms_equipamentos[0] 
        : tarefa.cmms_equipamentos;

      const eqNome = eqData?.nome || 'ATIVO DESCONHECIDO';
      const eqLocal = eqData?.localizacao || 'GERAL';
      const passos = tarefa.cmms_passos_manutencao || [];
      const isAtrasada = tarefa.proxima_execucao <= todayString;
      
      let textMessage = '';

      if (isAtrasada) {
        const dataProx = new Date(tarefa.proxima_execucao);
        const dataHojePura = new Date(todayString);
        const diffTime = dataHojePura.getTime() - dataProx.getTime();
        const diasAtraso = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        textMessage = `🚨 *ORION CMMS • ALERTA DE MANUTENÇÃO EM ATRASO* 🚨\n\n`;
        textMessage += `*ATIVO:* ${eqNome.toUpperCase()}\n`;
        textMessage += `*SETOR/LOCAL:* ${eqLocal.toUpperCase()}\n`;
        textMessage += `*STATUS CRÍTICO:* COBRANÇA DE EXECUÇÃO EM ATRASO HÁ ${diasAtraso} DIAS\n`;
        textMessage += `*PROCEDIMENTO VENCIDO:* ${tarefa.nome.toUpperCase()}\n`;
        textMessage += `*PRAZO EXPIRADO EM:* ${tarefa.proxima_execucao.split('-').reverse().join('/')}\n\n`;
      } else {
        textMessage = `⚠️ *ORION CMMS • CRONOGRAMA DE PREVENTIVAS* ⚠️\n\n`;
        textMessage += `*ATIVO:* ${eqNome.toUpperCase()}\n`;
        textMessage += `*SETOR/LOCAL:* ${eqLocal.toUpperCase()}\n`;
        textMessage += `*MANUTENÇÃO PROGRAMADA PARA AMANHÃ:* ${tarefa.nome.toUpperCase()}\n\n`;
      }

      if (passos.length > 0) {
        textMessage += `*PROCEDIMENTO OPERACIONAL PADRÃO (POP):*\n`;
        passos.sort((a: any, b: any) => a.ordem_passo - b.ordem_passo).forEach((p: any) => {
          textMessage += `${p.ordem_passo}. ${p.descricao.toUpperCase()}\n`;
        });
      } else {
        textMessage += `*ALERTA:* SEM CHECKLIST TÉCNICO VINCULADO NO PRONTUÁRIO.\n`;
      }

      textMessage += `\n_Módulo Orion CMMS • Rigor Formal e Compliance Operacional_`;

      // Retorna a promessa do fetch sem dar await dentro do loop
      return fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
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
    });

    // Resolve todos os disparos simultaneamente, mitigando timeouts na Netlify
    const resultados = await Promise.all(promessasDeDisparo);
    const totalEnviados = resultados.filter(res => res.ok).length;

    return NextResponse.json({ 
      success: true, 
      dateChecked: todayString, 
      processedAlerts: totalEnviados 
    });

  } catch (err: any) {
    console.error('Falha crítica no motor de cron do CMMS:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no barramento cron.' }, { status: 500 });
  }
}