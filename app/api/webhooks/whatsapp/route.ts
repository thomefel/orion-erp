// app/api/webhooks/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const EVO_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
const EVO_INSTANCE = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || '';
const EVO_TOKEN = process.env.NEXT_PUBLIC_EVOLUTION_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function isOutsideBusinessHours(inicio: string, fim: string, inicioAlmoco?: string | null, fimAlmoco?: string | null): boolean {
  // 1. Força a criação da data capturando e convertendo o fuso de forma estrita para Brasília
  const dataBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  
  // 2. Extrai o dia da semana correto de Brasília (0 = Domingo, 6 = Sábado)
  const diaSemana = dataBrasilia.getDay(); 

  // Finais de semana (Sábado = 6, Domingo = 0) o robô atende direto
  if (diaSemana === 0 || diaSemana === 6) return true;

  // Extrai as horas e minutos do momento atual
  const minutosAgora = dataBrasilia.getHours() * 60 + dataBrasilia.getMinutes();

  // 3. Verificação de Almoço: Se o tempo atual estiver dentro da janela configurada, o robô assume imediatamente
  if (inicioAlmoco && fimAlmoco) {
    const [hAlmocoIn, mAlmocoIn] = inicioAlmoco.split(':').map(Number);
    const [hAlmocoFim, mAlmocoFim] = fimAlmoco.split(':').map(Number);
    const minutosInicioAlmoco = hAlmocoIn * 60 + mAlmocoIn;
    const minutosFimAlmoco = hAlmocoFim * 60 + mAlmocoFim;

    if (minutosAgora >= minutosInicioAlmoco && minutosAgora <= minutosFimAlmoco) {
      return true; // Está no intervalo de almoço, ativa o robô
    }
  }

  // 4. Verificação padrão do encerramento do expediente comercial noturno/madrugada
  const [hInicio, mInicio] = inicio.split(':').map(Number);
  const [hFim, mFim] = fim.split(':').map(Number);
  const minutosInicio = hInicio * 60 + mInicio;
  const minutosFim = hFim * 60 + mFim;

  if (minutosInicio > minutosFim) {
    return minutosAgora >= minutosInicio || minutosAgora <= minutosFim;
  }
  return minutosAgora >= minutosInicio && minutosAgora <= minutosFim;
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7).toUpperCase();
  console.log(`[ORION TELEMETRIA] [${requestId}] 🚀 Nova requisição interceptada no Webhook.`);

  try {
    const body = await req.json();
    console.log(`[ORION TELEMETRIA] [${requestId}] Payload bruto recebido com sucesso.`);

    if (body.data?.key?.fromMe === true) {
      console.log(`[ORION TELEMETRIA] [${requestId}] ℹ️ Mensagem enviada pela própria clínica. Ignorando.`);
      return NextResponse.json({ status: 'ignored_from_me' });
    }

    const remoteJid = body.data?.key?.remoteJid || '';
    const numWhatsApp = remoteJid.split('@')[0];
    const pacienteNome = body.data?.pushName || 'Paciente';

    console.log(`[ORION TELEMETRIA] [${requestId}] Paciente identificado: ${pacienteNome} (${numWhatsApp})`);

    let mensagemTexto = '';
    if (body.data?.message?.conversation) {
      mensagemTexto = body.data.message.conversation;
    } else if (body.data?.message?.extendedTextMessage?.text) {
      mensagemTexto = body.data.message.extendedTextMessage.text;
    }

    console.log(`[ORION TELEMETRIA] [${requestId}] Conteúdo da mensagem: "${mensagemTexto}"`);

    if (!mensagemTexto || mensagemTexto.trim() === '') {
      console.log(`[ORION TELEMETRIA] [${requestId}] ⚠️ Mensagem sem conteúdo de texto processável. Encerrando.`);
      return NextResponse.json({ status: 'no_text_content' });
    }

    if (!GEMINI_API_KEY) {
      console.error(`[ORION TELEMETRIA] [${requestId}] ❌ ERRO CRÍTICO: Variável GEMINI_API_KEY não foi localizada no ambiente do servidor.`);
      return NextResponse.json({ error: 'Missing Gemini API Key on server environment' }, { status: 500 });
    }

    console.log(`[ORION TELEMETRIA] [${requestId}] Consultando tabela ia_config no Supabase...`);
    const { data: config, error: configError } = await supabase
      .from('ia_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error(`[ORION TELEMETRIA] [${requestId}] ❌ ERRO SUPABASE CONFIG:`, configError);
      return NextResponse.json({ error: 'Database config fetch failure', details: configError }, { status: 500 });
    }

    if (!config || !config.status_bot) {
      console.log(`[ORION TELEMETRIA] [${requestId}] ℹ️ Robô de IA encontra-se desativado globalmente na tabela ia_config.`);
      return NextResponse.json({ status: 'bot_disabled_in_database' });
    }

    const foraDoExpediente = isOutsideBusinessHours(
      config.horario_inicio_rpa, 
      config.horario_fim_rpa,
      config.horario_inicio_almoco,
      config.horario_fim_almoco
    );
    
    console.log(`[ORION TELEMETRIA] [${requestId}] Horário verificado. Fora do expediente comercial? ${foraDoExpediente}`);
    
    if (!foraDoExpediente) {
      console.log(`[ORION TELEMETRIA] [${requestId}] ℹ️ Mensagem recebida dentro do expediente humano. Ignorando resposta automática.`);
      return NextResponse.json({ status: 'inside_business_hours' });
    }

    console.log(`[ORION TELEMETRIA] [${requestId}] Verificando histórico e travas de intervenção humana...`);
    const { data: logConversa, error: logError } = await supabase
      .from('ia_conversas_logs')
      .select('*')
      .eq('paciente_whatsapp', numWhatsApp)
      .maybeSingle();

    if (logError) {
      console.error(`[ORION TELEMETRIA] [${requestId}] ❌ ERRO SUPABASE LOGS:`, logError);
    }

    if (logConversa?.intervencao_humana === true) {
      console.log(`[ORION TELEMETRIA] [${requestId}] 🛑 Intervenção humana ativa para este número. Robô mutado.`);
      return NextResponse.json({ status: 'human_intervention_active' });
    }

    const timestampInstancia = new Date().toISOString();
    let historico = logConversa ? logConversa.historico_mensagens : [];
    
    // Agrupa mensagens se o último bloco já for do usuário
    if (historico.length > 0 && historico[historico.length - 1].role === 'user') {
      console.log(`[ORION TELEMETRIA] [${requestId}] 📥 Agrupando mensagem picada.`);
      historico[historico.length - 1].parts[0].text += ` ${mensagemTexto}`;
    } else {
      if (historico.length === 0) {
        const superPrompt = `[DIRETRIZES DE PERSONA E REGRAS DA CLÍNICA]:\n${config.prompt_sistema}\n\n[MENSAGEM DO PACIENTE]: ${mensagemTexto}`;
        historico.push({ role: 'user', parts: [{ text: superPrompt }] });
      } else {
        historico.push({ role: 'user', parts: [{ text: mensagemTexto }] });
      }
    }

    // Grava o texto concatenado no banco e atualiza o carimbo de tempo
    await supabase.from('ia_conversas_logs').upsert({
      paciente_whatsapp: numWhatsApp,
      paciente_nome: pacienteNome,
      historico_mensagens: historico,
      status_atendimento: 'AQUECIDO',
      data_interacao: timestampInstancia
    }, { onConflict: 'paciente_whatsapp' });

    // Janela de espera tática (4 segundos)
    console.log(`[ORION TELEMETRIA] [${requestId}] ⏱️ Janela de debouncing ativa...`);
    await delay(4000);

    // Re-audita o banco de dados
    const { data: logVerificacao } = await supabase
      .from('ia_conversas_logs')
      .select('data_interacao')
      .eq('paciente_whatsapp', numWhatsApp)
      .maybeSingle();

    if (logVerificacao && logVerificacao.data_interacao) {
      const dbTime = new Date(logVerificacao.data_interacao).getTime();
      const instanciaTime = new Date(timestampInstancia).getTime();

      // Só cancela se o timestamp do banco for mais recente que o desta instância
      if (dbTime > instanciaTime) {
        console.log(`[ORION TELEMETRIA] [${requestId}] 🛑 Fluxo interceptado por nova mensagem mais recente. Cancelando.`);
        return NextResponse.json({ status: 'debounced_by_subsequent_message' });
      }
    }

    // Chamada limpa enviando APENAS a chave 'contents', garantindo compatibilidade universal
    console.log(`[ORION TELEMETRIA] [${requestId}] 🔥 Despachando para o modelo ativo gemini-2.5-flash...`);
    const urlGemini = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const startTimeGemini = Date.now();
    const responseGemini = await fetch(urlGemini, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: historico
      })
    });

    console.log(`[ORION TELEMETRIA] [${requestId}] Resposta obtida do Gemini em ${Date.now() - startTimeGemini}ms. Status: ${responseGemini.status}`);

    if (!responseGemini.ok) {
      const errorText = await responseGemini.text();
      console.error(`[ORION TELEMETRIA] [${requestId}] ❌ ERRO API GEMINI:`, errorText);
      return NextResponse.json({ error: 'Gemini service degradation', details: errorText }, { status: 500 });
    }

    const resData = await responseGemini.json();
    const textoRespostaIA = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textoRespostaIA || textoRespostaIA.trim() === '') {
      console.error(`[ORION TELEMETRIA] [${requestId}] ❌ Gemini retornou um payload de texto vazio.`);
      return NextResponse.json({ error: 'Empty response text from intelligence model' }, { status: 500 });
    }

    historico.push({ role: 'model', parts: [{ text: textoRespostaIA }] });

    console.log(`[ORION TELEMETRIA] [${requestId}] Atualizando dados de memória no Supabase...`);
    await supabase.from('ia_conversas_logs').upsert({
      paciente_whatsapp: numWhatsApp,
      paciente_nome: pacienteNome,
      historico_mensagens: historico,
      status_atendimento: 'AQUECIDO',
      data_interacao: new Date().toISOString()
    }, { onConflict: 'paciente_whatsapp' });

    console.log(`[ORION TELEMETRIA] [${requestId}] 📤 Despachando texto via Evolution-API para o WhatsApp do paciente...`);
    const responseEvo = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_TOKEN },
      body: JSON.stringify({ number: numWhatsApp, text: textoRespostaIA, delay: 1200 })
    });

    console.log(`[ORION TELEMETRIA] [${requestId}] ✅ Processo finalizado com sucesso. Retorno da Evolution: ${responseEvo.status}`);
    return NextResponse.json({ status: 'success', response: textoRespostaIA });

  } catch (error: any) {
    console.error(`[ORION TELEMETRIA] [${requestId}] 💥 CRASH INTERNO DA ROTA:`, error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}