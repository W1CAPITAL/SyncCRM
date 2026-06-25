
'use server';
/**
 * @fileOverview Motor de Inteligência Veredito AI V51 Elite.
 * Focado em extração cirúrgica de dados e validação de CNPJs Bancários.
 */

import { callOpenRouter, safeJsonParse, getBankCNPJ } from '@/lib/openrouter';

function cleanAiString(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  str = str.replace(/\*\*/g, '')
           .replace(/###/g, '')
           .replace(/##/g, '')
           .replace(/#/g, '')
           .replace(/---/g, '')
           .replace(/[`_]/g, '')
           .replace(/^[-*+]\s+/gm, '') 
           .trim();
  return str;
}

/**
 * Processa dados brutos para extrair qualificação de procuração.
 * V51 ELITE: Foca cirurgicamente nos dados da parte e ignora cláusulas contratuais.
 */
export async function processarProcuracao(dadosBrutos: string) {
  if (!dadosBrutos.trim()) return { success: false, error: "Dados não informados." };

  try {
    const promptText = `AJA COMO: Especialista em Legal Ops (V51 Elite). 
    Sua tarefa é analisar o texto abaixo e extrair EXCLUSIVAMENTE os dados necessários para uma procuração judicial.
    
    INSTRUÇÃO DE EXTRAÇÃO CIRÚRGICA:
    - IGNORE todas as cláusulas contratuais, datas de pagamento, multas ou textos irrelevantes.
    - Foque APENAS no preâmbulo/cabeçalho para achar: Nome Completo, Nacionalidade, Estado Civil, Profissão, RG, CPF, Endereço e E-mail.
    - Identifique o BANCO RÉU que é objeto da revisão (ex: Votorantim, Pan, Itau).
    - Se o e-mail não estiver explícito, retorne "NÃO INFORMADO".
    - Responda APENAS com o JSON estruturado.

    TEXTO PARA ANÁLISE:
    "${dadosBrutos.substring(0, 15000)}"

    RETORNE APENAS JSON PURO:
    {
      "nome": "NOME COMPLETO",
      "nacionalidade": "brasileiro(a)",
      "estadoCivil": "estado civil",
      "profissao": "profissão",
      "rg": "número do rg",
      "cpf": "número do cpf",
      "endereco": "Logradouro, Nº, Bairro, Cidade - UF, CEP",
      "email": "email ou NÃO INFORMADO",
      "bancoReu": "NOME DO BANCO"
    }`;

    const aiResponse = await callOpenRouter(promptText, true);
    const parsed = safeJsonParse(aiResponse);

    if (!parsed) throw new Error("Falha na extração cirúrgica de dados via V51.");

    // Validação de CNPJ via motor de busca real
    const bancoDetectado = cleanAiString(parsed.bancoReu || "BANCO NÃO IDENTIFICADO");
    const cnpjReal = getBankCNPJ(bancoDetectado);

    return {
      success: true,
      dados: {
        nome: cleanAiString(parsed.nome),
        nacionalidade: cleanAiString(parsed.nacionalidade),
        estadoCivil: cleanAiString(parsed.estadoCivil),
        profissao: cleanAiString(parsed.profissao),
        rg: cleanAiString(parsed.rg),
        cpf: cleanAiString(parsed.cpf),
        endereco: cleanAiString(parsed.endereco),
        email: cleanAiString(parsed.email),
        bancoReu: bancoDetectado,
        cnpjReu: cnpjReal
      }
    };
  } catch (e: any) {
    return { success: false, error: "Erro V51 na extração: " + e.message };
  }
}

export async function processarVeredito(cnj: string, engine: string) {
  if (!cnj.trim()) return { success: false, error: "CNJ não informado." };
  try {
    const promptText = `AJA COMO: Diretor de Legal Ops (V51 Elite). Analise o processo: ${cnj}. 
    PROIBIDO MARKDOWN. Retorne JSON: {termometro, traducao, alertas, plano_acao, whatsapp, followup}.`;
    const aiResponse = await callOpenRouter(promptText, true);
    const parsed = safeJsonParse(aiResponse);
    return { success: true, parecer: parsed };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function processarChat(mensagem: string, historico: any[], engine: string) {
  try {
    const promptText = `AJA COMO: Diretor de Operações Jurídicas Elite (V51). 
    Responda em parágrafos limpos sem markdown. Mensagem: ${mensagem}`;
    const aiResponse = await callOpenRouter(promptText, false);
    return { success: true, resposta: cleanAiString(aiResponse) };
  } catch (e: any) { return { success: false, error: e.message }; }
}
