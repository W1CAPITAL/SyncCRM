'use server';
/**
 * @fileOverview Motor de Inteligência Veredito AI V51 Elite.
 * Focado em análise cirúrgica e histórico digital DataJud com blindagem de strings.
 */

import { callOpenRouter, safeJsonParse, getBankCNPJ } from '@/lib/openrouter';

/**
 * Limpa artefatos de markdown e força conversão para string.
 * Blindagem absoluta contra erro 'replace is not a function'.
 */
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
  
  // Histórico expandido V51 Elite (Simulação DataJud completa)
  const historicoCompleto = [
    { data: "24/06/2024", evento: "Conclusos para Despacho - Urgente" },
    { data: "20/06/2024", evento: "Juntada de Petição de Manifestação sobre Laudo Pericial" },
    { data: "15/06/2024", evento: "Decisão Interlocutória Proferida - Indeferimento de Tutela" },
    { data: "10/06/2024", evento: "Expedição de Mandado de Citação e Intimação Eletrônica" },
    { data: "05/06/2024", evento: "Distribuído por Sorteio - Vara Cível Central" },
    { data: "01/06/2024", evento: "Protocolo de Petição Inicial - Revisional de Contrato" }
  ];

  try {
    const promptText = `AJA COMO: Diretor de Operações Jurídicas (V51 Elite). 
    Analise o processo CNJ: ${cnj}. 
    Considere o Histórico Completo: ${JSON.stringify(historicoCompleto)}.
    
    INSTRUÇÃO: Proibido respostas genéricas. Dê uma decisão cirúrgica baseada nos fatos para HOJE.
    RETORNE APENAS JSON PURO: 
    {
      "termometro": "Cenário crítico ou favorável em 1 frase.",
      "traducao": "O que aconteceu tecnicamente em 1 parágrafo limpo.",
      "alertas": "Riscos imediatos baseados no histórico.",
      "plano_acao": "Ação decisiva para HOJE (Comando direto).",
      "whatsapp": "Mensagem executiva profissional para o cliente.",
      "followup": "Data e motivo estratégico."
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

export async function processarProcuracao(dadosBrutos: string) {
  if (!dadosBrutos.trim()) return { success: false, error: "Dados não informados." };

  try {
    const promptText = `AJA COMO: Diretor de Legal Ops (V51 Elite). 
    Extraia EXCLUSIVAMENTE os dados de qualificação do cliente para uma procuração judicial.
    IGNORE cláusulas contratuais. Foque no preâmbulo: Nome, Nacionalidade, Estado Civil, Profissão, RG, CPF, Endereço e E-mail.
    Identifique o BANCO RÉU.

    TEXTO: "${dadosBrutos.substring(0, 15000)}"

    RETORNE APENAS JSON:
    {
      "nome": "NOME COMPLETO",
      "nacionalidade": "brasileiro(a)",
      "estadoCivil": "estado civil",
      "profissao": "profissão",
      "rg": "número",
      "cpf": "número",
      "endereco": "endereço completo",
      "email": "email",
      "bancoReu": "NOME DO BANCO"
    }`;

    const aiResponse = await callOpenRouter(promptText, true);
    const parsed = safeJsonParse(aiResponse);

    if (!parsed) throw new Error("Falha na extração.");

    const bancoDetectado = cleanAiString(parsed.bancoReu || "BANCO NÃO IDENTIFICADO");
    const cnpjReal = getBankCNPJ(bancoDetectado);

    return {
      success: true,
      dados: {
        ...parsed,
        nome: cleanAiString(parsed.nome),
        bancoReu: bancoDetectado,
        cnpjReu: cnpjReal
      }
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function processarChat(mensagem: string, historico: any[], engine: string) {
  try {
    const promptText = `AJA COMO: Diretor de Legal Ops Sênior (V51). 
    Responda sem markdown. Mensagem: ${mensagem}`;
    const aiResponse = await callOpenRouter(promptText, false);
    return { success: true, resposta: cleanAiString(aiResponse) };
  } catch (e: any) { return { success: false, error: e.message }; }
}