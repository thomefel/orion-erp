// app/api/webhooks/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

const EVO_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
const EVO_INSTANCE = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || '';
const EVO_TOKEN = process.env.NEXT_PUBLIC_EVOLUTION_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; // Certifique-se de adicionar no .env.local

// Função Tática: Valida se a hora atual está fora do horário comercial ou é final de semana
function isOutsideBusinessHours(inicio: string, fim: string): boolean {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0 = Domingo, 6 = Sábado

  // Sábados e Domingos a IA atua em tempo integral de contingência
  if (diaSemana === 0 || diaSemana === 6) return true;

  const [hInicio, mInicio] = inicio.split(':').map(Number);
  const [hFim, mFim] = fim.split(':').map(Number);

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosInicio = hInicio * 60 + mInicio;
  const minutosFim = hFim * 60 + mFim;

  // Tratamento de janela que vira a noite (Ex: 19:00 às 08:00)
  if (minutosInicio > minutosFim) {
    return minutosAgora >= minutosInicio || minutosAgora <= minutosFim;
  }

  return minutosAgora >= minutosInicio && minutosAgora <= minutosFim;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Regra de Ouro: Ignora se a mensagem foi disparada pela própria clínica (fromMe)
    if (body.data?.key?.fromMe === true) {
      return NextResponse.json({ status: 'ignored_from_me' });
    }

    const remoteJid = body.data?.key?.remoteJid || '';
    const numWhatsApp = remoteJid.split('@')[0];
    const pacienteNome = body.data?.pushName || 'Paciente';

    // Extração robusta do conteúdo textual recebido da Evolution-API
    let mensagemTexto = '';
    if (body.data?.message?.conversation) {
      mensagemTexto = body.data.message.conversation;
    } else if (body.data?.message?.extendedTextMessage?.text) {
      mensagemTexto = body.data.message.extendedTextMessage.text;
    }

    if (!mensagemTexto || mensagemTexto.trim() === '') {
      return NextResponse.json({ status: 'no_text_content' });
    }

    // 1. Coleta a parametrização de IA ativa na Nuvem
    const { data: config } = await supabase
      .from('ia_config')
      .select('*')
      .single();

    if (!config || !config.status_bot) {
      return NextResponse.json({ status: 'bot_disabled' });
    }

    // 2. Auditoria Cronológica: Intercepta apenas se estiver fora do expediente
    const foraDoExpediente = isOutsideBusinessHours(config.horario_inicio_rpa, config.horario_fim_rpa);
    if (!foraDoExpediente) {
      return NextResponse.json({ status: 'inside_business_hours' });
    }

    // 3. Validação de Intervenção Humana preexistente no Supabase
    const { data: logConversa } = await supabase
      .from('ia_conversas_logs')
      .select('*')
      .eq('paciente_whatsapp', numWhatsApp)
      .single();

    if (logConversa?.intervencao_humana === true) {
      return NextResponse.json({ status: 'human_intervention_active' });
    }

    // 4. Estruturação da Memória de Contexto Longo (Array JSONB para o Gemini)
    let historico = logConversa ? logConversa.historico_mensagens : [];
    
    // Injeta a nova linha do usuário mapeando para a convenção do Google (user)
    historico.push({ role: 'user', parts: [{ text: mensagemTexto }] });

    // 5. Chamada de Alta Performance para o Gemini 1.5 Flash (Custo R$ 0)
    const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const responseGemini = await fetch(urlGemini, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: historico,
        systemInstruction: {
          parts: [{ text: config.prompt_sistema }]
        }
      })
    });

    if (!responseGemini.ok) {
      console.error('Erro na comunicação com a API do Google:', await responseGemini.text());
      return NextResponse.json({ status: 'gemini_api_error' }, { status: 500 });
    }

    const resData = await responseGemini.json();
    const textoRespostaIA = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textoRespostaIA || textoRespostaIA.trim() === '') {
      return NextResponse.json({ status: 'empty_gemini_payload' });
    }

    // Mapeia a resposta da IA para a convenção do Google (model) e salva no histórico
    historico.push({ role: 'model', parts: [{ text: textoRespostaIA }] });

    // 6. Atualização de Estados no Supabase
    await supabase.from('ia_conversas_logs').upsert({
      paciente_whatsapp: numWhatsApp,
      paciente_nome: pacienteNome,
      historico_mensagens: historico,
      status_atendimento: 'AQUECIDO',
      data_interacao: new Date().toISOString()
    }, { onConflict: 'paciente_whatsapp' });

    // 7. Despacho Físico de Transmissão via Evolution-API para o WhatsApp do Paciente
    await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_TOKEN },
      body: JSON.stringify({ number: numWhatsApp, text: textoRespostaIA, delay: 1200 })
    });

    return NextResponse.json({ status: 'success', response: textoRespostaIA });

  } catch (error) {
    console.error('Erro crítico no Webhook Orquestrador:', error);
    return NextResponse.json({ status: 'server_crash_error' }, { status: 500 });
  }
}