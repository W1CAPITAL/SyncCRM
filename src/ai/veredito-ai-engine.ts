'use server';
/**
 * @fileOverview Motor de Inteligência Lexis Predict V55 Elite.
 */

import { callOpenRouter, safeJsonParse, getBankCNPJ } from '@/lib/openrouter';

function cleanAiString(val: any): string {
  const str = String(val || "");
  if (!str || str === "undefined" || str === "null") return "";
  return str.replace(/\*\*/g, '')
           .replace(/###/g, '')
           .replace(/##/g, '')
           .replace(/#/g, '')
           .replace(/---/g, '')
           .replace(/[`_]/g, '')
           .replace(/^[-*+]\s+/gm, '') 
           .trim();
}

export async function processarVeredito(cnj: string, engine: string) {
  if (!cnj.trim()) return { success: false, error: "CNJ não informado." };
  
  const historicoCompleto = [
    { data: "24/06/2024", evento: "Conclusos para Despacho - Urgente" },
    { data: "20/06/2024", evento: "Juntada de Petição de Manifestação sobre Laudo Pericial" },
    { data: "15/06/2024", evento: "Decisão Interlocutória Proferida - Indeferimento de Tutela" },
    { data: "10/06/2024", evento: "Expedição de Mandado de Citação e Intimação Eletrônica" },
    { data: "05/06/2024", evento: "Distribuído por Sorteio - Vara Cível Central" },
    { data: "01/06/2024", evento: "Protocolo de Petição Inicial - Revisional de Contrato" }
  ];

  try {
    const promptText = `AJA COMO: Diretor de Operações Jurídicas (Lexis Predict). 
    Analise o processo CNJ: ${cnj}. 
    Considere o Histórico Completo: ${JSON.stringify(historicoCompleto)}.
    RETORNE APENAS JSON PURO: 
    {
      "termometro": "Cenário crítico ou favorável.",
      "traducao": "Resumo técnico limpo.",
      "alertas": "Riscos imediatos.",
      "plano_acao": "Ação decisiva para hoje.",
      "whatsapp": "Mensagem curta para o cliente no WhatsApp.",
      "followup": "Próxima revisão."
    }`;

    const aiResponse = await callOpenRouter(promptText, true);
    const parsed = safeJsonParse(aiResponse);
    
    return { 
      success: true, 
      parecer: {
        termometro: cleanAiString(parsed?.termometro),
        traducao: cleanAiString(parsed?.traducao),
        alertas: cleanAiString(parsed?.alertas),
        plano_acao: cleanAiString(parsed?.plano_acao),
        whatsapp: cleanAiString(parsed?.whatsapp),
        followup: cleanAiString(parsed?.followup)
      },
      historico: historicoCompleto
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function gerarRespostaWhatsApp(pergunta: string, contexto: any, tom: 'juridico' | 'comercial' | 'curto') {
  try {
    const promptText = `AJA COMO: Especialista em Atendimento Jurídico (Lexis Predict).
    CLIENTE: ${contexto.cliente}
    PROCESSO: ${contexto.processo}
    FASE ATUAL: ${contexto.status}
    PRÓXIMO PRAZO: ${contexto.prazo}
    
    PERGUNTA/MENSAGEM DO CLIENTE: "${pergunta}"
    TOM DA RESPOSTA: ${tom.toUpperCase()}

    INSTRUÇÃO: Gere uma resposta profissional, empática e baseada estritamente no contexto acima. 
    Se o prazo estiver vencido, tranquilize o cliente dizendo que estamos atuando.
    PROIBIDO USAR MARKDOWN. RESPONDA APENAS O TEXTO DA MENSAGEM.`;

    const aiResponse = await callOpenRouter(promptText, false);
    return { success: true, resposta: cleanAiString(aiResponse) };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function processarChat(mensagem: string, historico: any[], engine: string) {
  try {
    const promptText = `AJA COMO: Diretor de Legal Ops Sênior (Lexis Predict). 
    Responda sem markdown. Mensagem: ${mensagem}`;
    const aiResponse = await callOpenRouter(promptText, false);
    return { success: true, resposta: cleanAiString(aiResponse) };
  } catch (e: any) { return { success: false, error: e.message }; }
}
