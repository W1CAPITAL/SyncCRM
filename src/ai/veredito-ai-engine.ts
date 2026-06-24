
'use server';

/**
 * @fileOverview Motor de Programação Veredito AI v12.0 (OpenAI Powered)
 * Operação exclusiva via OpenRouter.
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

/**
 * Identifica o tribunal pelo CNJ para roteamento na API do DataJud
 */
function getCourtFromCNJ(cnj: string) {
  const clean = cnj.replace(/\D/g, '');
  if (clean.length < 20) return { alias: 'tjsp', name: 'TJSP' };

  const j = clean.substring(13, 14);
  const tr = clean.substring(14, 16);

  if (j === '8') {
    const states: Record<string, string> = {
      '26': 'tjsp', '19': 'tjrj', '13': 'tjmg', '16': 'tjpr', '21': 'tjrs',
      '01': 'tjac', '02': 'tjal', '03': 'tjam', '04': 'tjap', '05': 'tjba',
      '06': 'tjce', '07': 'tjdf', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
      '11': 'tjmt', '12': 'tjms', '14': 'tjpa', '15': 'tjpb', '17': 'tjpe',
      '18': 'tjpi', '20': 'tjrn', '22': 'tjro', '23': 'tjrr', '24': 'tjsc',
      '25': 'tjse', '27': 'tjto'
    };
    return { alias: states[tr] || 'tjsp', name: states[tr]?.toUpperCase() || 'TJSP' };
  }
  if (j === '4') return { alias: 'trf' + tr, name: 'TRF' + tr };
  if (j === '5') return { alias: 'trt' + tr, name: 'TRT' + tr };
  
  return { alias: 'tjsp', name: 'Tribunal de Justiça' };
}

/**
 * Busca dados técnicos na API Pública do DataJud (CNJ)
 */
export async function fetchProcessData(cnj: string) {
  const courtInfo = getCourtFromCNJ(cnj);
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${courtInfo.alias}/_search`;

  const payload = {
    query: {
      term: {
        "numeroProcesso.keyword": cnj.replace(/\D/g, '')
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'APIKey ' + DATAJUD_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`DataJud API Error: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      court: courtInfo.name,
      hits: result.hits?.hits || [],
    };
  } catch (error: any) {
    return { success: false, error: error.message, hits: [], court: courtInfo.name };
  }
}

/**
 * Auxiliar para garantir que valores sejam strings limpas
 */
function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(item => `• ${ensureString(item)}`).join("\n");
  if (typeof val === 'object') {
    const content = val.resumo || val.risco || val.sugestao || val.texto || val.justificativa || val.nome || val.descricao;
    if (content) return ensureString(content);
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * Executa o fluxo de análise cognitiva Veredito AI via OpenRouter
 */
export async function executarVereditoAI(cnj: string) {
  const cleanCnj = cnj.trim();
  if (!cleanCnj) return { success: false, error: "CNJ inválido." };

  const dados = await fetchProcessData(cleanCnj);
  
  if (dados.success && dados.hits.length > 0) {
    const rawProcess = dados.hits[0]._source;
    
    const metadata = {
      orgao: ensureString(rawProcess.orgaoJulgador),
      classe: ensureString(rawProcess.classe),
      tribunal: ensureString(rawProcess.tribunal || dados.court),
      grau: ensureString(rawProcess.grau || "G1"),
      ultimaAtualizacao: rawProcess.dataHoraUltimaAtualizacao ? new Date(rawProcess.dataHoraUltimaAtualizacao).toLocaleString('pt-BR') : "Desconhecida"
    };

    const promptText = `Você é um Consultor Jurídico Sênior da W1 Capital.
Analise os seguintes dados técnicos de um processo do DataJud (CNJ):
${JSON.stringify(rawProcess)}

Sua resposta deve ser estritamente um objeto JSON puro com estas chaves exatas:
"resumo": Um texto corrido resumindo o caso e movimentações.
"risco": Um texto corrido analisando o risco técnico.
"sugestao": Um texto corrido ou lista simples com as próximas ações.

IMPORTANTE: Responda apenas com o JSON. Não use Markdown ou textos extras.`;

    try {
      const openRouterRes = await callOpenRouter(promptText, true);
      const parsed = safeJsonParse(openRouterRes);
      
      if (parsed) {
        return {
          success: true,
          cnj: cleanCnj,
          parecer: {
            resumo: ensureString(parsed.resumo),
            risco: ensureString(parsed.risco),
            sugestao: ensureString(parsed.sugestao)
          },
          metadata,
          timestamp: new Date().toISOString()
        };
      }
    } catch (e: any) {
      return { success: false, error: `Erro no Motor AI: ${e.message}`, timestamp: new Date().toISOString() };
    }
  }

  return {
    success: false,
    error: "Nenhum registro público detalhado foi encontrado para este CNJ.",
    timestamp: new Date().toISOString()
  };
}

/**
 * Gera relatórios estratégicos baseados em prompts livres
 */
export async function gerarRelatorioEstrategico(prompt: string) {
  const promptText = `Você é o Arquiteto de Soluções da W1 Capital. 
Gere um relatório estratégico de alta fidelidade baseado no comando:
${prompt}`;

  try {
    return await callOpenRouter(promptText, false);
  } catch (e) {
    return "Erro de conexão com o motor estratégico.";
  }
}
