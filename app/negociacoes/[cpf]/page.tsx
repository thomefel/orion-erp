'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { 
  ChevronLeft, 
  Save, 
  Send, 
  FileDown, 
  CheckCircle2, 
  User, 
  Calendar,
  Loader2,
  AlertTriangle,
  Gavel,
  FileText,
  Scale,
  Trash2,
  XCircle,
  BookOpen,
  ShieldAlert,
  Info,
  Phone,
  Hourglass 
} from 'lucide-react';

const EVO_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
const EVO_INSTANCE = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || '';
const EVO_TOKEN = process.env.NEXT_PUBLIC_EVOLUTION_TOKEN || '';

export default function DetalheNegociacao() {
  const { cpf } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCelular, setSavingCelular] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false); 
  const [devedor, setDevedor] = useState<any>(null);

  const [valorEditavel, setValorEditavel] = useState(0);
  const [celularEditavel, setCelularEditavel] = useState("");
  const [msgAmigavel, setMsgAmigavel] = useState("");
  const [propostaDesconto, setPropostaDesconto] = useState(0);
  const [parcelasAcordo, setParcelasAcordo] = useState(1);
  const [jurosAcordo, setJurosAcordo] = useState(0);

  // Form inputs para preenchimento do documento robusto de Notificação RTD
  const [rtdNotificandEnd, setRtdNotificandEnd] = useState("");
  const [rtdOrigemObrigacao, setRtdOrigemObrigacao] = useState("Prestação de Serviços Odontológicos");
  const [rtdDescricaoDebito, setRtdDescricaoDebito] = useState("Parcelas em aberto de tratamento clínico executado");
  const [rtdPrazoDias, setRtdPrazoDias] = useState("5 (cinco) dias úteis");
  const [rtdChavePix, setRtdChavePix] = useState("acodontologia.itapema@gmail.com");
  const [rtdDadosBanco, setRtdDadosBanco] = useState("Banco Inter - Agência 0001 - C/C 123456-7");
  const [rtdResponsavelNome, setRtdResponsavelNome] = useState("AC ODONTOLOGIA");
  const [rtdResponsavelCargo, setRtdResponsavelCargo] = useState("Departamento de Recuperação de Ativos");

  // Controle dos motores de PDF e dos Pop-ups Modais
  const [statusLoadingPDF, setStatusLoadingPDF] = useState(false);
  const [statusLoadingRtdPDF, setStatusLoadingRtdPDF] = useState(false);
  const [statusLoadingConfissaoPDF, setStatusLoadingConfissaoPDF] = useState(false);
  const [isProtestModalOpen, setIsProtestModalOpen] = useState(false);
  const [isNegativacaoModalOpen, setIsNegativacaoModalOpen] = useState(false);
  const [isContatoModalOpen, setIsContatoModalOpen] = useState(false);
  const [isRtdModalOpen, setIsRtdModalOpen] = useState(false);

  useEffect(() => {
    fetchDevedor();
  }, [cpf]);

  async function fetchDevedor() {
    const { data } = await supabase
      .from('devedores_historicos')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (data) {
      setDevedor(data);
      setValorEditavel(data.valor_total);
      setCelularEditavel(data.celular || "");
      setPropostaDesconto(data.proposta_desconto || 0);
      setParcelasAcordo(data.parcelas_acordo || 1);
      setJurosAcordo(data.juros_acordo || 0);
      setMsgAmigavel(`Olá, ${data.nome.split(' ')[0]}. Sou do setor de conciliação da AC Odontologia. Notamos valores pendentes há mais de 60 dias. Gostaríamos de ouvir você para chegarmos a uma solução boa para ambos. Podemos conversar sobre uma condition especial hoje?`);
    }
    setLoading(false);
  }

  const handleUpdateProposta = async () => {
    // Atualiza estritamente os parâmetros numéricos da proposta calculada
    const { error } = await supabase
      .from('devedores_historicos')
      .update({
        proposta_desconto: propostaDesconto,
        parcelas_acordo: parcelasAcordo,
        juros_acordo: jurosAcordo
      })
      .eq('cpf', cpf);

    if (!error) {
      alert("Sucesso: Parâmetros da proposta salvos com sucesso no banco de dados!");
      fetchDevedor(); 
    } else {
      console.error("Erro Supabase Proposta:", error);
      alert("Erro operacional ao tentar salvar os parâmetros da proposta.");
    }
  };

  const toggleFlag = async (field: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('devedores_historicos')
      .update({ [field]: !currentValue })
      .eq('cpf', cpf);
    if (!error) fetchDevedor();
  };

  const handleUpdateValue = async () => {
    setSaving(true);
    await supabase.from('devedores_historicos').update({ valor_total: valorEditavel }).eq('cpf', cpf);
    setSaving(false);
    fetchDevedor();
  };

  const handleUpdateCelular = async () => {
    setSavingCelular(true);
    const { error } = await supabase
      .from('devedores_historicos')
      .update({ celular: celularEditavel })
      .eq('cpf', cpf);
    setSavingCelular(false);
    fetchDevedor();
  };

  const handleDeleteDebt = async () => {
    const confirmDelete = confirm("ATENÇÃO: Deseja excluir permanentemente este registro de dívida? Esta ação não pode ser desfeita.");
    if (!confirmDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('devedores_historicos')
      .delete()
      .eq('cpf', cpf);

    if (!error) {
      router.push('/negociacoes');
    } else {
      alert("Erro ao excluir registro.");
      setIsDeleting(false);
    }
  };

  const realizarChamadaApi = async (numero: string, texto: string) => {
    let numLimpo = numero.replace(/\D/g, '');
    if (numLimpo.length > 0 && !numLimpo.startsWith('55')) numLimpo = '55' + numLimpo;
    try {
      const res = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_TOKEN },
        body: JSON.stringify({ number: numLimpo, text: texto, delay: 1200 })
      });
      return { ok: res.ok, status: res.status, data: await res.json(), numUsado: numLimpo };
    } catch (e) {
      return { ok: false, status: 500, data: null, numUsado: numLimpo };
    }
  };

  const enviarWhatsApp = async (texto: string) => {
    const alvoMensagem = devedor?.celular ? devedor.celular.replace(/\D/g, '') : devedor?.cpf?.replace(/\D/g, '');
    if (!alvoMensagem || alvoMensagem.trim() === '') {
      alert("Erro operacional: Nenhum canal de contato ou identificador válido localizado para este devedor.");
      return;
    }

    setSendingMessage(true);

    let result = await realizarChamadaApi(alvoMensagem, texto);
    let sucessoTotal = false;

    if (result.ok) sucessoTotal = true;
    else if (result.status === 400) {
      const errorStr = JSON.stringify(result.data).toLowerCase();
      if (errorStr.includes('"exists":false') || errorStr.includes('not exists')) {
        let numAlt = result.numUsado.length === 13 
          ? result.numUsado.slice(0, 4) + result.numUsado.slice(5) 
          : result.numUsado.slice(0, 4) + '9' + result.numUsado.slice(4);
        const result2 = await realizarChamadaApi(numAlt, texto);
        if (result2.ok) sucessoTotal = true;
      }
    }

    setSendingMessage(false);

    if (sucessoTotal) {
      alert("Sucesso: Mensagem de conciliação transmitida em tempo real via Evolution API!");
      if (!devedor?.notificacao_amigavel) toggleFlag('notificacao_amigavel', false);
    } else {
      alert("Erro de Conexão: Falha ao transmitir mensagem. Verifique a ativação da instância ou a higienização do número.");
      if (!devedor?.contato_desatualizado) toggleFlag('contato_desatualizado', false);
    }
  };

  // --- MOTOR DE EMISSÃO DE PDF JURÍDICO: NOTIFICAÇÃO SIMPLES ---
  const generateNotificationPDF = async () => {
    try {
      setStatusLoadingPDF(true);
      const jsPDFLib = (window as any).jspdf?.jsPDF || await new Promise((resolve, reject) => {
        if ((window as any).jspdf?.jsPDF) return resolve((window as any).jspdf.jsPDF);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve((window as any).jspdf.jsPDF);
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
      });

      const doc = new jsPDFLib();
      doc.setFont("helvetica", "normal");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("NOTIFICAÇÃO EXTRAJUDICIAL DE CONSTITUIÇÃO EM MORA", 105, 30, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(20, 35, 190, 35);
      
      doc.setFontSize(10);
      doc.text("NOTIFICANTE:", 20, 50);
      doc.setFont("helvetica", "normal");
      doc.text("AC ODONTOLOGIA, pessoa jurídica estabelecida na Comarca de Itapema/SC.", 52, 50);
      
      doc.setFont("helvetica", "bold");
      doc.text("NOTIFICADO(A):", 20, 58);
      doc.setFont("helvetica", "normal");
      doc.text(`${devedor?.nome || 'Paciente Inexistente'}`, 52, 58);
      
      doc.setFont("helvetica", "bold");
      doc.text("CPF/MF Nº:", 20, 66);
      doc.setFont("helvetica", "normal");
      doc.text(`${devedor?.cpf || 'Não informado'}`, 52, 66);
      
      doc.setFont("helvetica", "bold");
      doc.text("Prezado(a) Senhor(a),", 20, 82);
      
      doc.setFont("helvetica", "normal");
      const dataFmt = devedor?.data_divida ? new Date(devedor.data_divida).toLocaleDateString('pt-BR') : '';
      const valorFmt = valorEditavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const textoCorpo = `Por meio deste instrumento formal, servimo-nos da presente via para constituílo(a) oficialmente em MORA, nos estritos termos dos artigos 394, 395 e 397 da Lei nº 10.406/2002 (Código Civil Brasileiro), em virtude do inadimplemento de obrigações financeiras líquidas, certas e exigíveis junto a esta instituição notificante.\n\nConstata-se em nossos registros cadastrais e contábeis a existência de um passivo consolidado no montante total de R$ ${valorFmt}, correspondente a ${devedor?.parcelas_qtd || 0} parcela(s) em aberto decorrente(s) de prestação de serviços odontológicos contratados, cujo vencimento inicial operou-se em ${dataFmt}.\n\nMalgrado os reiterados esforços e tentativas de composição amigável promovidos pelo nosso departamento de conciliação interna, não obtivemos, até a presente data, a devida regularização ou qualquer manifestação plausível para adimplemento do saldo devedor.\n\nDiante do exposto, ASSINÁMOS o prazo improrrogável de 48 (quarenta e oito) horas, a contar do recebimento desta interlocução, para que Vossa Senhoria proceda à liquidação do referido débito ou compareça à nossa sede operacional para formalizar termo de confissão de dívida.\n\nA inércia ou recusa no cumprimento da presente determinação extrajudicial ensejará a imediata adoção de medidas coercitivas legais cabíveis, as quais incluem, mas não se limitam a: (i) protesto público do título perante o Cartório de Registro de Títulos e Documentos da Comarca de Itapema/SC; (ii) inclusão restritiva de seu nome junto aos órgãos de proteção ao crédito (SPC/SERASA); e (iii) propositura de Ação Judicial de Execução ou Cobrança cabível, respondendo o devedor por perdas, danos, juros moratórios, correção monetária e honorários advocatícios sucumbenciais, ex vi do artigo 389 do Código Civil Brasileiro.`;
      
      const textLines = doc.splitTextToSize(textoCorpo, 170);
      doc.text(textLines, 20, 92);
      
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      doc.text(`Itapema/SC, ${dataAtual}.`, 20, 225);
      
      doc.line(60, 255, 150, 255);
      doc.setFont("helvetica", "bold");
      doc.text("AC ODONTOLOGIA", 105, 260, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text("Departamento de Recuperação de Ativos", 105, 265, { align: "center" });
      
      doc.save(`Notificacao_Simples_${devedor?.cpf}.pdf`);
      setStatusLoadingPDF(false);
      if (!devedor?.notificacao_extrajudicial) toggleFlag('notificacao_extrajudicial', false);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setStatusLoadingPDF(false);
      alert("Falha ao processar o motor de arquivos PDF.");
    }
  };

  // --- MOTOR DE EMISSÃO DE PDF JURÍDICO ROBUSTO: CARTÓRIO RTD ---
  const generateRtdPDF = async () => {
    try {
      setStatusLoadingRtdPDF(true);
      const jsPDFLib = (window as any).jspdf?.jsPDF || await new Promise((resolve, reject) => {
        if ((window as any).jspdf?.jsPDF) return resolve((window as any).jspdf.jsPDF);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve((window as any).jspdf.jsPDF);
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
      });

      const doc = new jsPDFLib();
      doc.setFont("helvetica", "normal");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("NOTIFICAÇÃO EXTRAJUDICIAL", 105, 25, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(20, 30, 190, 30);
      
      doc.setFontSize(10);
      doc.text("NOTIFICANTE:", 20, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`${rtdResponsavelNome} | CNPJ nº 12.345.678/0001-99`, 52, 40);
      doc.text("Av. Nereu Ramos, Meia Praia, Itapema/SC | E-mail: financeiro@acodontologia.com.br", 52, 45);
      
      doc.setFont("helvetica", "bold");
      doc.text("NOTIFICADO(A):", 20, 55);
      doc.setFont("helvetica", "normal");
      doc.text(`${devedor?.nome || 'Paciente Inexistente'} | CPF nº ${devedor?.cpf || ''}`, 52, 55);
      doc.text(`${rtdNotificandEnd || 'Endereço não preenchido'}`, 52, 60, { maxWidth: 140 });
      
      doc.setFont("helvetica", "bold");
      doc.text("ASSUNTO:", 20, 72);
      doc.setFont("helvetica", "normal");
      doc.text("COBRANÇA DE DÉBITO EM ABERTO E CONSTITUIÇÃO EM MORA", 52, 72);
      
      doc.setFont("helvetica", "bold");
      doc.text("Prezado(a) Senhor(a),", 20, 85);
      
      doc.setFont("helvetica", "normal");
      const dataFmt = devedor?.data_divida ? new Date(devedor.data_divida).toLocaleDateString('pt-BR') : '';
      const valorFmt = valorEditavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const textoCorpo = `Na qualidade de credora, a NOTIFICANTE vem, por meio desta, NOTIFICAR Vossa Senhoria acerca da existência de débito pendente relacionado a ${rtdOrigemObrigacao}.\n\n1. DO DÉBITO\nEncontra-se em aberto o valor total de R$ ${valorFmt}, referente a: ${rtdDescricaoDebito}.\nVencimento original: ${dataFmt}.\nAtualizado até a presente data: R$ ${valorFmt}.\n\nConforme ajustado entre as partes, o pagamento deveria ter ocorrido na data acima indicada, o que não ocorreu até o presente momento.\n\n2. DA CONSTITUIÇÃO EM MORA\nPor meio desta notificação, fica Vossa Senhoria formalmente constituído(a) em mora, nos termos da legislação civil aplicável, sendo concedido o prazo improrrogável de ${rtdPrazoDias}, contados do recebimento desta, para regularização integral do débito.\n\nO pagamento poderá ser realizado por meio de:\nPIX: ${rtdChavePix}\nBanco: ${rtdDadosBanco}\nOu outro meio previamente acordado entre as partes.\n\n3. DAS MEDIDAS CABÍVEIS\nO não pagamento no prazo acima poderá ensejar, a critério da NOTIFICANTE, a adoção das medidas administrativas e judiciais cabíveis, incluindo: protesto do débito; inscrição em órgãos de proteção ao crédito, quando legalmente aplicável; cobrança judicial; execução do débito, quando cabível; incidência de juros, correção monetária, custas e honorários advocatícios.\n\nA presente notificação também serve como demonstração de tentativa de solução amigável da controvérsia.\n\nSem mais para o momento, aguardamos a regularização no prazo informado.`;
      
      const textLines = doc.splitTextToSize(textoCorpo, 170);
      doc.text(textLines, 20, 95);
      
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      doc.text(`Itapema/SC, ${dataAtual}.`, 20, 235);
      
      doc.line(60, 255, 150, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`${rtdResponsavelNome}`, 105, 260, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(`${rtdResponsavelCargo}`, 105, 265, { align: "center" });
      
      doc.save(`Notificacao_Cartorio_RTD_${devedor?.cpf}.pdf`);
      setStatusLoadingRtdPDF(false);
      if (!devedor?.notificacao_rtd) toggleFlag('notificacao_rtd', false);
    } catch (error) {
      console.error("Erro ao gerar PDF do RTD:", error);
      setStatusLoadingRtdPDF(false);
      alert("Falha ao processar o motor de arquivos PDF.");
    }
  };

  // --- MOTOR DE EMISSÃO DE PDF JURÍDICO: CONFISSÃO DE DÍVIDA ---
  const generateConfissaoPDF = async () => {
    try {
      setStatusLoadingConfissaoPDF(true);
      const jsPDFLib = (window as any).jspdf?.jsPDF || await new Promise((resolve, reject) => {
        if ((window as any).jspdf?.jsPDF) return resolve((window as any).jspdf.jsPDF);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve((window as any).jspdf.jsPDF);
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
      });

      const doc = new jsPDFLib();
      doc.setFont("helvetica", "normal");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("INSTRUMENTO PARTICULAR DE CONFISSÃO E PARCELAMENTO DE DÍVIDA", 105, 25, { align: "center" });
      doc.setFontSize(10);
      doc.text("(TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, INCISO III, DO CPC)", 105, 31, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(20, 36, 190, 36);
      
      let y = 48;
      doc.setFont("helvetica", "bold"); doc.text("CREDOR:", 20, y);
      doc.setFont("helvetica", "normal"); doc.text("AC ODONTOLOGIA, pessoa jurídica estabelecida em Itapema/SC.", 45, y);
      
      y += 8;
      doc.setFont("helvetica", "bold"); doc.text("DEVEDOR(A):", 20, y);
      doc.setFont("helvetica", "normal"); doc.text(`${devedor?.nome || 'Paciente Inexistente'}`, 45, y);
      
      y += 8;
      doc.setFont("helvetica", "bold"); doc.text("CPF/MF Nº:", 20, y);
      doc.setFont("helvetica", "normal"); doc.text(`${devedor?.cpf || 'Não informado'}`, 45, y);
      
      y += 12;
      doc.setFont("helvetica", "normal");
      const valorFmt = valorEditavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const dataFmt = devedor?.data_divida ? new Date(devedor.data_divida).toLocaleDateString('pt-BR') : '';
      
      const textoIntro = `As partes acima qualificadas têm entre si, de maneira justa e contratada, o presente Instrumento Particular de Confissão de Dívida, mediante as cláusulas e condições seguintes, amparadas pelo Art. 784, III do Código de Processo Civil brasileiro e pela torrencial jurisprudência do Egrégio Tribunal de Justiça de Santa Catarina (TJSC):`;
      let splitIntro = doc.splitTextToSize(textoIntro, 170);
      doc.text(splitIntro, 20, y);
      y += (splitIntro.length * 5) + 5;
      
      doc.setFont("helvetica", "bold"); doc.text("CLÁUSULA PRIMEIRA - DO RECONHECIMENTO DA DÍVIDA:", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      const c1 = `O(A) DEVEDOR(A) reconhece expressamente, de forma irrevogável and irretratável, que possui uma dívida líquida, certa e exigível perante o CREDOR no valor total de R$ ${valorFmt}, decorrente do inadimplemento de tratamentos odontológicos contratados e executados, cuja inadimplência inicial remonta a ${dataFmt}.`;
      let splitC1 = doc.splitTextToSize(c1, 170);
      doc.text(splitC1, 20, y);
      y += (splitC1.length * 5) + 5;
      
      doc.setFont("helvetica", "bold"); doc.text("CLÁUSULA SEGUNDA - DA FORMA DE PAGAMENTO E COMPOSIÇÃO:", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      const valorLiquidoFmt = (valorEditavel - propostaDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const descontoFmt = propostaDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const c2 = `O valor originalmente confessado, após a aplicação de um desconto de cortesia concedido e aceito no importe de R$ ${descontoFmt}, resulta no montante líquido acordado de R$ ${valorLiquidoFmt}. As partes estipulam que este saldo remanescente será liquidado de forma parcelada, mediante o prazo fixado de ${parcelasAcordo} parcela(s) mensais, iguais e sucessivas, com a incidência de uma taxa de juros de parcelamento de ${jurosAcordo.toLocaleString('pt-BR')}% ao mês, nos exatos moldes acordados no ato de conciliação. A tolerância do CREDOR quanto a eventual atraso não constituirá novação contratual.`;
      
      let splitC2 = doc.splitTextToSize(c2, 170);
      doc.text(splitC2, 20, y);
      y += (splitC2.length * 5) + 5;

      if (y > 230) {
        doc.addPage();
        y = 25;
      }

      doc.setFont("helvetica", "bold"); doc.text("CLÁUSULA TERCEIRA - ENCARGOS MORATÓRIOS E VENCIMENTO ANTECIPADO:", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      const c3 = `Em caso de atraso de qualquer parcela pactuada, incidirá multa moratória de 2% (dois por cento) sobre o saldo devedor, juros de mora de 1% (um por cento) ao mês e correção monetária pelo INPC/IBGE. Ademais, o inadimplemento de qualquer parcela ensejará o vencimento antecipado de toda a dívida remanescente, autorizando a execução judicial imediata do título.`;
      let splitC3 = doc.splitTextToSize(c3, 170);
      doc.text(splitC3, 20, y);
      y += (splitC3.length * 5) + 5;

      doc.setFont("helvetica", "bold"); doc.text("CLÁUSULA QUARTA - DA FORÇA EXECUTIVA EXTRAJUDICIAL:", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      const c4 = `Este instrumento é firmado na presença de 02 (duas) testemunhas idôneas, constituindo-se expressamente como TÍTULO EXECUTIVO EXTRAJUDICIAL, apto a embasar Ação de Execução direta perante o Poder Judiciário, nos exatos termos do Artigo 784, inciso III, do Código de Processo Civil. Elegem as partes o Foro da Comarca de Itapema/SC para dirimir controvérsias.`;
      let splitC4 = doc.splitTextToSize(c4, 170);
      doc.text(splitC4, 20, y);
      y += (splitC4.length * 5) + 15;

      if (y > 220) {
        doc.addPage();
        y = 25;
      }

      const dataAtual = new Date().toLocaleDateString('pt-BR');
      doc.text(`Itapema/SC, ${dataAtual}.`, 20, y);
      y += 25;
      
      doc.line(20, y, 95, y); doc.line(115, y, 190, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("AC ODONTOLOGIA (Credor)", 57, y, { align: "center" });
      doc.text("DEVEDOR(A)", 152, y, { align: "center" });
      
      y += 25;
      doc.line(20, y, 95, y); doc.line(115, y, 190, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text("Testemunha 1 (Nome/CPF)", 57, y, { align: "center" });
      doc.text("Testemunha 2 (Nome/CPF)", 152, y, { align: "center" });

      doc.save(`Confissao_Divida_${devedor?.cpf}.pdf`);
      setStatusLoadingConfissaoPDF(false);
      if (!devedor?.confissao_assinada) toggleFlag('confissao_assinada', devedor.confissao_assinada);
    } catch (error) {
      console.error("Erro ao gerar PDF de confissão:", error);
      setStatusLoadingConfissaoPDF(false);
      alert("Falha ao processar o motor de arquivos PDF.");
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse text-left uppercase text-[10px] tracking-widest">Carregando Dashboard Tático...</div>;
  if (!devedor) return <div className="p-20 text-center font-black text-slate-400 text-left uppercase text-[10px] tracking-widest">Registro não localizado ou inválido na Nuvem.</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-left">
      <header className="mb-10 text-left">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-6 transition-all cursor-pointer">
          <ChevronLeft size={16} /> Voltar para a lista
        </button>
        <h1 className="text-4xl font-black text-slate-900 uppercase italic">
          <span className="text-blue-600 not-italic">{devedor?.nome}</span>
        </h1>
        <p className="text-slate-500 font-medium mt-1">Sequência das ações de cobrança</p>
      </header>

      {/* SEÇÃO 1: INFORMAÇÕES DA DÍVIDA */}
      <section className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm mb-12">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
          <User size={14} className="text-blue-600" /> Informações do Devedor
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-end">
          <div className="md:col-span-1">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Paciente</label>
            <p className="font-bold text-slate-900 uppercase truncate">{devedor?.nome}</p>
            <p className="font-mono text-[11px] text-slate-400 mt-1">{devedor?.cpf}</p>
          </div>
          
          <div className="md:col-span-1">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Origem do Débito</label>
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Calendar size={14} className="text-slate-300" /> {devedor?.data_divida ? new Date(devedor.data_divida).toLocaleDateString('pt-BR') : ''}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic">{devedor?.parcelas_qtd || 0} parcelas em atraso</p>
          </div>

          <div className="md:col-span-2 flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-black text-blue-600 uppercase mb-2">Valor em Aberto (R$)</label>
              <input 
                type="number" 
                value={valorEditavel}
                onChange={(e) => setValorEditavel(Number(e.target.value))}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-xl text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <button 
              onClick={handleUpdateValue}
              className="h-[60px] px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Atualizar Dívida'}
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: TRILHO DE NEGOCIAÇÃO */}
      {/* SEÇÃO 2: MATRIZ DE FLUXO DINÂMICO E BIFURCAÇÕES DE NEGOCIAÇÃO */}
      <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm mb-12">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12 flex items-center gap-2">
          <Scale size={14} className="text-blue-600" /> Matriz de Negociação - Ações X Comportamento do Devedor
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* COLUNA A: FUNIL EXTRAJUDICIAL (NOTIFICAÇÕES DE ESCALAÇÃO) */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <h4 className="font-black text-xs uppercase tracking-wider flex items-center gap-2">TRILHO A: FUNIL EXTRAJUDICIAL</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Contato inicial e ações progressivas devido inação do devedor</p>
            </div>

            {/* ABORDAGEM CONSULTIVA */}
            <div className={`p-6 rounded-3xl border ${sendingMessage ? 'opacity-40 pointer-events-none' : ''} ${devedor?.notificacao_amigavel ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="font-black text-[10px] uppercase tracking-wider text-slate-800">01. Abordagem Amigável</span>
                <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">D+60 a D+75</span>
              </div>
              <textarea 
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 font-medium h-20 outline-none focus:ring-1 focus:ring-blue-500 mb-3"
                value={msgAmigavel}
                onChange={(e) => setMsgAmigavel(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <button onClick={() => enviarWhatsApp(msgAmigavel)} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <Send size={12} /> Enviar Mensagem
                </button>
                <button onClick={() => toggleFlag('notificacao_amigavel', devedor?.notificacao_amigavel)} className={`w-full py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.notificacao_amigavel ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  {devedor?.notificacao_amigavel ? 'Mensagem Enviada' : 'Marcar Executado'}
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-[10px] font-bold text-slate-400 space-y-1">
                <p className="text-blue-600">➔ Se Respondeu: avançar para TRILHO B</p>
                <p className="text-slate-500">➔ Se Ignorou: prosseguir para Notificação Simples</p>
              </div>
            </div>

            {/* NOTIFICAÇÃO SIMPLES */}
            <div className={`p-6 rounded-3xl border ${devedor?.notificacao_extrajudicial ? 'bg-blue-50/20 border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="font-black text-[10px] uppercase tracking-wider text-slate-800">02. Notificação Simples</span>
                <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">D+75 a D+90</span>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={generateNotificationPDF} disabled={statusLoadingPDF} className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 py-3 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600 cursor-pointer">
                  {statusLoadingPDF ? <Loader2 className="animate-spin text-blue-600" size={12} /> : <FileText size={12} className="text-blue-600" />} 
                  Emitir PDF Notificação
                </button>
                <button onClick={() => toggleFlag('notificacao_extrajudicial', devedor?.notificacao_extrajudicial)} className={`w-full py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.notificacao_extrajudicial ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  {devedor?.notificacao_extrajudicial ? 'Notificado' : 'Marcar Executado'}
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-[10px] font-bold text-slate-400 space-y-1">
                <p className="text-blue-600">➔ Se Respondeu: avançar para TRILHO B</p>
                <p className="text-slate-500">➔ Se Ignorou: prosseguir para Notificação via Cartório RTD</p>
              </div>
            </div>

            {/* NOTIFICAÇÃO EXTRAJUDICIAL VIA CARTÓRIO RTD (TODOS OS 6 CAMPOS INTEGRAIS) */}
            <div className={`p-6 rounded-3xl border ${devedor?.notificacao_rtd ? 'bg-orange-50/10 border-orange-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="font-black text-[10px] uppercase tracking-wider text-slate-800">03. Notificação via Cartório RTD</span>
                <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">D+90 a D+100</span>
              </div>
              
              {/* TODOS OS 6 CAMPOS DA IMPLEMENTAÇÃO ORIGINAL REENCAIXADOS AQUI */}
              <div className="space-y-2 mb-4 bg-white p-3 rounded-xl border border-slate-100 shadow-inner text-[11px]">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Endereço do Notificado</label>
                  <input type="text" value={rtdNotificandEnd} onChange={(e) => setRtdNotificandEnd(e.target.value)} placeholder="Ex: Av. Nereu Ramos, 1200..." className="w-full bg-slate-50 border-none rounded p-1.5 outline-none font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Origem da Obrigação</label>
                  <input type="text" value={rtdOrigemObrigacao} onChange={(e) => setRtdOrigemObrigacao(e.target.value)} className="w-full bg-slate-50 border-none rounded p-1.5 outline-none font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Descrição do Débito</label>
                  <input type="text" value={rtdDescricaoDebito} onChange={(e) => setRtdDescricaoDebito(e.target.value)} className="w-full bg-slate-50 border-none rounded p-1.5 outline-none font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Prazo para Regularização</label>
                  <input type="text" value={rtdPrazoDias} onChange={(e) => setRtdPrazoDias(e.target.value)} className="w-full bg-slate-50 border-none rounded p-1.5 outline-none font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Chave PIX</label>
                  <input type="text" value={rtdChavePix} onChange={(e) => setRtdChavePix(e.target.value)} className="w-full bg-slate-50 border-none rounded p-1.5 outline-none font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">Dados Bancários para Depósito</label>
                  <input type="text" value={rtdDadosBanco} onChange={(e) => setRtdDadosBanco(e.target.value)} className="w-full bg-slate-50 border-none rounded p-1.5 outline-none font-bold text-slate-700" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={generateRtdPDF} disabled={statusLoadingRtdPDF} className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600 cursor-pointer">
                  {statusLoadingRtdPDF ? <Loader2 className="animate-spin text-orange-600" size={12} /> : <FileDown size={12} className="text-orange-600" />} 
                  Emitir PDF Notificação RTD
                </button>
                <button onClick={() => setIsRtdModalOpen(true)} className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-500 cursor-pointer">
                  <BookOpen size={12} className="text-slate-400" /> Manual Notificação RTD
                </button>
                <button onClick={() => toggleFlag('notificacao_rtd', devedor?.notificacao_rtd)} className={`w-full py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.notificacao_rtd ? 'bg-orange-600 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  {devedor?.notificacao_rtd ? 'Protocolado' : 'Marcar Executado'}
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-[10px] font-bold text-slate-400 space-y-1">
                <p className="text-blue-600">➔ Se Respondeu: avançar para TRILHO B</p>
                <p className="text-red-500">➔ Se Ignorou: avançar para TRILHO C</p>
              </div>
            </div>

            {/* HIGIENIZAÇÃO DE CONTATO (ORGANIZADO COMO ENCARTE UTILIÁRIO) */}
            <div className={`p-6 rounded-3xl border ${devedor?.contato_desatualizado ? 'bg-amber-50/20 border-amber-200' : 'bg-slate-50/50 border-slate-100'}`}>
              <span className="block font-black text-[10px] uppercase tracking-wider text-slate-800 mb-3">Validação do Celular</span>
              <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase">Status: <span className={devedor?.contato_desatualizado ? "text-amber-600 font-black" : "text-emerald-600 font-black"}>{devedor?.contato_desatualizado ? "Inválido" : "Ativo"}</span></p>
              <input type="text" placeholder="Ex: 47999999999" value={celularEditavel} onChange={(e) => setCelularEditavel(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700 text-xs mb-3 outline-none" />
              <div className="flex gap-2">
                <button onClick={handleUpdateCelular} disabled={savingCelular} className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all cursor-pointer">{savingCelular ? '...' : 'Salvar'}</button>
                <button onClick={() => setIsContatoModalOpen(true)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer">Buscar</button>
                <button onClick={() => toggleFlag('contato_desatualizado', devedor?.contato_desatualizado)} className={`px-3 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.contato_desatualizado ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>Invalidar</button>
              </div>
            </div>
          </div>

          {/* COLUNA B: NÚCLEO DE CONCILIAÇÃO (TRILHO DE ACORDO E COMPOSIÇÃO) */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <h4 className="font-black text-xs uppercase tracking-wider flex items-center gap-2">TRILHO B: ACORDO E TERMO DE DÍVIDA</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Ações para quando o paciente responder e aceitar acordo</p>
            </div>

            {/* SIMULAÇÃO DA PROPOSTA DE ACORDO (COMPACTA) */}
            <div className={`p-6 rounded-3xl border bg-white border-blue-100 shadow-sm shadow-blue-50/50`}>
              <span className="block font-black text-[10px] uppercase tracking-wider mb-4">04. Simulação para Proposta de Acordo</span>
              <div className="space-y-4">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Simular Desconto de Cortesia (R$)</label>
                  <input type="number" placeholder="0,00" value={propostaDesconto} onChange={(e) => setPropostaDesconto(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 font-bold text-slate-700 outline-none text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Número de Parcelas</label>
                    <input type="number" min="1" step="1" value={parcelasAcordo} onChange={(e) => setParcelasAcordo(Math.max(1, Math.floor(Number(e.target.value))))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 font-bold text-slate-700 outline-none text-xs" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Juros (% ao mês)</label>
                    <input type="number" min="0" step="0.01" placeholder="0,00" value={jurosAcordo} onChange={(e) => setJurosAcordo(Math.max(0, Number(e.target.value)))} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 font-bold text-slate-700 outline-none text-xs" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Valor Líquido:</span>
                  <span className="text-base font-black text-blue-600">R$ {(valorEditavel - propostaDesconto).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdateProposta} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md cursor-pointer">Salvar Simulação</button>
                </div>
              </div>
            </div>

            {/* FIRMAMENTO DE ACORDO */}
            <div className={`p-6 rounded-3xl border ${devedor?.acordo_firmado ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <span className="block font-black text-[10px] uppercase tracking-wider text-slate-800 mb-2">05. Firmamento de Acordo</span>
              <p className="text-[11px] font-medium text-slate-400 mb-4">O paciente expressou aceite formal aos termos, prazos e taxas</p>
              <button onClick={() => toggleFlag('acordo_firmado', devedor?.acordo_firmado)} className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.acordo_firmado ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                {devedor?.acordo_firmado ? 'Acordo Aceito' : 'Marcar Executado'}
              </button>
            </div>

            {/* CONFISSÃO DE DÍVIDA E ASSINATURA DO TERMO */}
            <div className={`p-6 rounded-3xl border ${devedor?.confissao_assinada ? 'bg-violet-50/20 border-violet-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="font-black text-[10px] uppercase tracking-wider text-slate-800">06. Termo de Confissão de Dívida</span>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={generateConfissaoPDF} disabled={statusLoadingConfissaoPDF} className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600 cursor-pointer">
                  {statusLoadingConfissaoPDF ? <Loader2 className="animate-spin text-violet-600" size={12} /> : <FileDown size={12} className="text-violet-600" />} 
                  Emitir Termo de Dívida
                </button>
                <button onClick={() => toggleFlag('confissao_assinada', devedor?.confissao_assinada)} className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.confissao_assinada ? 'bg-violet-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  {devedor?.confissao_assinada ? 'Termo Assinado' : 'Marcar Executado'}
                </button>
              </div>

              {/* ARQUITETURA DE COMPORTAMENTOS CONDICIONAIS PÓS-ACORDO */}
              <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] space-y-2.5">
                <span className="block font-black text-slate-400 uppercase tracking-wider">Ações Seguintes</span>
                <div className="space-y-2 font-bold">
                  <div className="items-start gap-1.5 text-slate-500">
                    <p>➔ Não assinou (sem contrato): regredir para TRILHO A</p>
                  </div>
                  <div className="items-start gap-1.5 text-slate-500">
                    <p className="text-red-500">➔ Não assinou (com contrato): avançar para TRILHO C</p>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-500">
                    <p className="text-red-500">➔ Assinou e não cumpriu: avançar para TRILHO C</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA C: FASE SANCIONATÓRIA (MEDIDAS COERCITIVAS E EXECUÇÃO JUDICIAL) */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <h4 className="font-black text-xs uppercase tracking-wider flex items-center gap-2">TRILHO C: FASE SANCIONATÓRIA</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Acionado por silêncio total contumaz ou quebra do Termo de Confissão</p>
            </div>

            {/* MEDIDAS COERCITIVAS */}
            <div className={`p-6 rounded-3xl border ${devedor?.protesto_realizado ? 'bg-red-50/10 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <span className="block font-black text-[10px] uppercase tracking-wider text-slate-800 mb-4">07. Restrições e Medidas Coercitivas</span>
              <div className="flex flex-col gap-2">
                <button onClick={() => setIsProtestModalOpen(true)} className={`py-3 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.protesto_realizado ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-red-200'}`}>
                  Protestar em Cartório
                </button>
                <button onClick={() => setIsNegativacaoModalOpen(true)} className={`py-3 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.protesto_realizado ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-red-200'}`}>
                  Negativar SPC/Serasa
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200 text-[10px] font-bold text-slate-400">
                <p className="text-red-500">➔ Permanecendo Inerte: escalar para Execução Judicial</p>
              </div>
            </div>

            {/* EXECUÇÃO JUDICIAL */}
            <div className={`p-6 rounded-3xl border ${devedor?.judicializado ? 'bg-slate-900 text-white' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`font-black text-[10px] uppercase tracking-wider ${devedor?.judicializado ? 'text-blue-400' : 'text-slate-900'}`}>08. Execução Judicial</span>
                <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 text-slate-900">D+120 +</span>
              </div>
              <div className={`p-4 rounded-xl border mb-4 flex flex-col gap-1 ${devedor?.judicializado ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <p className={`text-[10px] font-black uppercase ${devedor?.judicializado ? 'text-white' : 'text-slate-900'}`}>Ajuizamento de Ação</p>
                <p className="text-[9px] font-medium text-slate-400">Dossiê completo protocolado no Fórum da Comarca de Itapema/SC.</p>
              </div>
              <button onClick={() => toggleFlag('judicializado', devedor?.judicializado)} className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer ${devedor?.judicializado ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                {devedor?.judicializado ? 'Judicializado' : 'Marcar Executado'}
              </button>
                
            </div>

            {/* QUITAÇÃO OU EXCLUSÃO DE REGISTRO */}
            <div className="p-6 rounded-3xl bg-red-50/30 border border-transparent">
              <span className="block font-black text-[10px] uppercase tracking-wider text-red-600 mb-2">Descarte ou Quitação Final</span>
              <button onClick={handleDeleteDebt} disabled={isDeleting} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-1 cursor-pointer">
                {isDeleting ? <Loader2 className="animate-spin" size={12} /> : <XCircle size={12} />}
                {isDeleting ? 'Excluindo...' : 'Excluir Registro de Dívida'}
              </button>
            </div>
          </div>

        </div>
      </section>
      {/* --- POPUP/MODAL INTERNO 1: MANUAL OPERACIONAL DO PROTESTANTE (ITAPEMA/SC) --- */}
      {isProtestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase italic flex items-center gap-2">
                  <BookOpen size={20} className="text-red-500" /> Manual do Protestante
                </h3>
                <p className="text-xs text-slate-400 font-medium uppercase mt-0.5">Roteiro Legal e Operacional • Comarca de Itapema / SC</p>
              </div>
              <button onClick={() => setIsProtestModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="space-y-6 flex-1 pr-2 text-slate-600 text-sm overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs text-left">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase block mb-1 text-left">Atenção Negociador Sênior:</span>
                  Este manual serve de guia estrito para protocolar o passivo junto ao Tabelionato de Notas e Protestos de Itapema. Siga as etapas na ordem para evitar notas de devolução de título.
                </div>
              </div>
              <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6 text-left">
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 1: Auditoria da Força Executiva do Título</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Certifique-se de que o **Termo de Confissão de Dívida** gerado no Passo 07 está assinado digitalmente ou fisicamente pelo devedor e por **duas testemunhas identificadas com CPF**. O Provimento da CGJ/SC exige a qualificação estrita das testemunhas para conferir a natureza de título executivo extrajudicial (Art. 784, III, do CPC).
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 2: Atualização e Fixação Contábil do Débito</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O valor a ser apontado no cartório deve ser rigorosamente idêntico ao montante líquido estipulado no sistema (R$ {valorEditavel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}). Calcule os encargos moratórios autorizados na Cláusula Terceira do contrato (INPC/IBGE + juros moratórios de 1% ao mês *pro rata die*). O cartório rejeitará duplicidade ou excesso de execução sem justificativa descrita em planilha anexa.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 3: Acesso ao Portal do CRA-SC (Internet)</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O envio preferencial é eletrônico através da **CRA-SC (Central de Remessa de Arquivos de Santa Catarina)**, operada pelo IEPTB-SC (ieptbsc.com.br). Utilize o certificado digital ICP-Brasil da clínica para acessar o ambiente e gerar o arquivo de remessa contendo os dados do devedor e as informações do título confessado.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 4: Protocolo Presencial Alternativo (Balcão)</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Caso opte pelo protocolo físico, dirija-se ao **Tabelionato de Notas e Protestos de Itapema**, localizado na Av. Nereu Ramos, na Meia Praia. Apresente o Instrumento Particular original assinado, cópia do contrato de prestação de serviços odontológicos da AC Odontologia, e o requerimento de apontamento devidamente assinado pelo representante da clínica.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 5: Qualificação do Endereço de Notificação</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O endereço do devedor deve estar rigorosamente atualizado. O cartório realiza a notificação de forma pessoal. Endereços genéricos ou desatualizados causarão a devolução do título com a certidão de "não localizado". Caso o devedor mude de endereço furtivamente, o tabelião efetuará o protesto por Edital de Imprensa Oficial.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 6: Prazo de Intimação Legal Cartorária</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Uma vez protocolado o título, o cartório expedirá a intimação. Em Santa Catarina, o devedor possui o prazo improrrogável de **3 (três) dias úteis** após o recebimento para comparecer ao balcão do tabelionato e efetuar o pagamento integral das parcelas acumuladas acrescidas das taxas do cartório.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 7: Lavratura e Negativação Automática de Crédito</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Se o devedor não quitar o débito no prazo de 3 dias úteis, o Tabelião lavrará o protesto definitivo. O efeito prático é imediato: restrição total do CPF nos sistemas bancários nacionais, cancelamento de crédito mercante e inserção automática nos bancos de dados de proteção ao crédito (SPC e SERASA).
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
              <button onClick={() => setIsProtestModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer text-center">
                Fechar Manual
              </button>
              <button 
                onClick={() => {
                  toggleFlag('protesto_realizado', devedor?.protesto_realizado);
                  setIsProtestModalOpen(false);
                }}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer text-center text-white ${devedor?.protesto_realizado ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {devedor?.protesto_realizado ? 'Remover Flag de Protesto' : 'Marcar como Protestado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP/MODAL INTERNO 2: MANUAL DA NEGATIVAÇÃO CADASTRAL (SPC/SERASA) --- */}
      {isNegativacaoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase italic flex items-center gap-2">
                  <Info size={20} className="text-red-500" /> Manual da Negativação Cadastral
                </h3>
                <p className="text-xs text-slate-400 font-medium uppercase mt-0.5">Diretrizes de Restrição de Crédito • SPC Brasil / Serasa Experian</p>
              </div>
              <button onClick={() => setIsNegativacaoModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="space-y-6 flex-1 pr-2 text-slate-600 text-sm overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs text-left">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase block mb-1 text-left">Segurança de Crédito e Compliance:</span>
                  A inclusión nos cadastros restritivos exige rigor absoluto de informações para evitar indenizações com base na Súmula 548 do STJ. Certifique-se de que a origem contábil do passivo está 100% auditada.
                </div>
              </div>
              <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6 text-left">
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 1: Notificação Prévia Obrigatória (Art. 43, §2º do CDC)</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Por lei, o devedor deve ser previamente comunicado por escrito antes da publicidade da restrição. Esse ato é automatizado pelos próprios birôs de crédito assim que a AC Odontologia faz a inclusão no sistema, concedendo um prazo de tolerância para o devedor regularizar o saldo diretamente na plataforma antes da negativação expor-se ao mercado.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 2: Inclusão via Sistema Credenciado (CDL / Serasa)</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Acesse o painel restritivo utilizando o CNPJ credenciado da clínica. Informações com exatidão o CPF do paciente, número do contrato original de prestação de serviços odontológicos, e a data exata em que ocorreu o primeiro inadimplemento (vencimento da primeira parcela em atraso: {devedor?.data_divida ? new Date(devedor.data_divida).toLocaleDateString('pt-BR') : ''}).
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 3: Vedação de Cobrança Abusiva e Tarifas Contratuais</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O montante lançado (R$ {valorEditavel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) deve refletir exclusivamente a obrigação líquida odontológica não paga, corrigida estritamente pelos índices contratuais. Jamais inclua juros flutuantes abusivos ou taxas administrativas não previstas em contrato, sob risco de readequação judicial com sanções de repetição do indébito.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 4: Súmula 385 do STJ e Inadimplência Contumaz</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Antes de consolidar o envio, verifique se o devedor já possui anotações preexistentes legítimas no sistema. De acordo com a Súmula 385 do Superior Tribunal de Justiça, da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral quando preexistente legítima inscrição, ressalvado o direito ao cancelamento.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 5: Conseqüências Comerciais e Travamento do Score</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Após o prazo de 10 dias da postagem da carta de aviso do birô, caso o devedor permaneça inerte, a restrição torna-se pública. Isso causa a queda imediata do Score de Crédito do paciente, impedindo financiamentos bancários, emissão de talões de cheque, limites comerciais e novos contratos de crédito em todo o território nacional.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 6: Prazo de Baixa Obrigatória Pós-Quitação (Súmula 548 / STJ)</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    A partir do momento em que o assunto for liquidado ou houver o pagamento da primeira parcela do novo acordo firmado, a AC Odontologia tem o prazo improrrogável de **5 (cinco) dias úteis** para efetuar a baixa da negativação no sistema. O descumprimento desse prazo gera dano moral presumido (*in re ipsa*) conforme jurisprudência unificada dos tribunais.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
              <button onClick={() => setIsNegativacaoModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer text-center">
                Fechar Manual
              </button>
              <button 
                onClick={() => {
                  toggleFlag('protesto_realizado', devedor?.protesto_realizado);
                  setIsNegativacaoModalOpen(false);
                }}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer text-center text-white ${devedor?.protesto_realizado ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {devedor?.protesto_realizado ? 'Remover Flag de Restrição' : 'Marcar como Negativado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP/MODAL INTERNO 3: MANUAL DE HIGIENIZAÇÃO CADASTRAL (SKIP TRACING) --- */}
      {isContatoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase italic flex items-center gap-2">
                  <BookOpen size={20} className="text-amber-500" /> Manual de Localização Cadastral
                </h3>
                <p className="text-xs text-slate-400 font-medium uppercase mt-0.5">Metodologias de Skip Tracing Legal • AC Odontologia</p>
              </div>
              <button onClick={() => setIsContatoModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="space-y-6 flex-1 pr-2 text-slate-600 text-sm overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs text-left">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase block mb-1 text-left">Inteligência Cadastral e LGPD:</span>
                  A busca por dados de contato para fins de exercício regular de direito e cobrança extrajudicial é perfeitamente legal. Utilize canais oficiais e birôs homologados para enriquecimento.
                </div>
              </div>
              <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6 text-left">
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 1: Auditoria Interna do Prontuário Clínico</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Antes de recorrer a ferramentas externas, audite a ficha de anamnese do paciente no Simples Dental. Verifique telefones fixos secundários, e-mails cadastrados, contatos de familiares ou responsáveis informados na primeira consulta da AC Odontologia.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 2: Bureau Governamental e Consulta Pública</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Utilize o portal oficial da Receita Federal do Brasil para emitir o Comprovante de Situação Cadastral no CPF. Isso valida se o CPF do paciente não sofreu fraudes, cancelamentos ou suspensões que inviabilizem o envio de notificações formais.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 3: Plataformas de Enriquecimento de Dados Privados</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Utilize os sistemas corporativos contratados de enriquecimento cadastral (ex: Assertiva, Procob, Localize Serasa ou BigData). Forneça o CPF do paciente para extrair o histórico de números de telefones móveis vinculados ao indivíduo, ordenados por score de recência e atividade no mercado.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 4: Filtro de WhatsApp e Validação Ativa</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Ao isolar os 3 números de maior score no birô, faça uma checagem rápida de presença de conta ativa do WhatsApp (foto de perfil, status). Identificado o canal correto, insira o número no campo de higienização do Orion para restaurar a comunicação automatizada.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
              <button onClick={() => setIsContatoModalOpen(false)} className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer text-center">
                Fechar Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP/MODAL INTERNO 4: MANUAL OPERACIONAL DE NOTIFICAÇÃO VIA CARTÓRIO RTD --- */}
      {isRtdModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase italic flex items-center gap-2">
                  <BookOpen size={20} className="text-orange-500" /> Roteiro de Notificação via RTD
                </h3>
                <p className="text-xs text-slate-400 font-medium uppercase mt-0.5">Doutrina e Prática de Entrega com Fé Pública</p>
              </div>
              <button onClick={() => setIsRtdModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="space-y-6 flex-1 pr-2 text-slate-600 text-sm overflow-y-auto">
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex gap-3 text-orange-800 text-xs text-left">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase block mb-1 text-left">Segurança Jurídica Maciça:</span>
                  Este modelo atende perfeitamente os requisitos das serventias de Registro de Títulos e Documentos (RTD), gerando prova robusta de mora que impossibilita a alegação de desconhecimento perante o juízo.
                </div>
              </div>
              <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6 text-left">
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 1: Adequação e Objetividade Factual</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Os registradores exigem textos formais, claros e focados estritamente na realidade fática do passivo, sem excessos de argumentação jurídica. O documento gerado consolida rigorosamente a origem da obrigação, o vencimento e o saldo nominal histórico.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 2: Enriquecimento com Memória de Cálculo</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Sempre anexe ao documento físico ou eletrônico enviado ao cartório a planilha de evolução de cálculo gerada pelo Orion (principal, multa moratória de 2%, juros contratuais pro rata e correção). Isso evita notas de devolução da assessoria do RTD.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 3: Chaves de Assinatura e Envio Eletrônico</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O documento gerado pode ser assinado de forma física ou através de assinatura eletrônica qualificada ICP-Brasil. Grande parte dos cartórios de Santa Catarina já realizam a recepção em lote via arquivo PDF assinado digitalmente através de seus portais web centrais.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 4: Qualificação Estratégica de Endereço</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    Direcione a diligência do oficial registrador prioritariamente para o endereço contido na Receita Federal ou no contrato comercial original da clínica. Isso blinda a AC Odontologia contra teses defensivas de nulidade por "envio para local incorreto".
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 5: Praticidade de Prazos Legais</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O padrão tático homologado do documento prevê o prazo regulamentar de **5 dias úteis** ou **10 dias corridos**. Prazos menores do que 48 horas sofrem frequentes contestações ou são encarados com desconfiança por magistrados em litígios futuros.
                  </p>
                </div>
                <div>
                  <div className="absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 text-left">Passo 6: Fé Pública Cadastral e Certidões</h5>
                  <p className="text-xs leading-relaxed text-slate-500 text-left">
                    O valor probatório absoluto não reside na carta enviada, mas sim na certidão devolvida pelo escrevente técnico do cartório. Sejam certidões de entrega efetuada, de recusa formal em assinar, de ausência continuada ou mudança oculta de endereço, qualquer um dos desfechos constitui prova irrefutável para instruir Execuções Judiciais ou Ações Monitórias.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
              <button onClick={() => setIsRtdModalOpen(false)} className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer text-center">
                Fechar Roteiro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}