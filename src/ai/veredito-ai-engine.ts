'use server';

/**
 * @fileOverview Motor de Programação Veredito AI v16.0 (OpenRouter EXCLUSIVE)
 * Operação 100% Next.js Pura. Genkit e Firebase Removidos.
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

function getCourtFromCNJ(cnj: string) {
  const clean = cnj.replace(/\D/g, '');
  if (clean.length < 20) return { alias: 'tjsp', name: 'TJSP' };
  const tr = clean.substring(14, 16);
  const j = clean.substring(13, 14);
  
  if (j === '8') {
    const states: Record<string, string> = { '26': 'tjsp', '19': 'tjrj', '13': 'tjmg', '16': 'tjpr', '21': 'tjrs' };
    return { alias: states[tr] || 'tjsp', name: states[tr]?.toUpperCase() || 'TJSP' };
  }
  return { alias: 'tjsp', name: 'Tribunal' };
}

export async function fetchProcessData(cnj: string) {
  const courtInfo = getCourtFromCNJ(cnj);
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${courtInfo.alias}/_search`;
  const payload = { query: { term: { "numeroProcesso.keyword": cnj.replace(/\D/g, '') } } };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'APIKey ' + DATAJUD_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return { success: true, court: courtInfo.name, hits: result.hits?.hits || [] };
  } catch (error: any) {
    return { success: false, error: error.message, hits: [], court: courtInfo.name };
  }
}

function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(v => `• ${ensureString(v)}`).join("\n");
  if (typeof val === 'object') {
    return val.resumo || val.risco || val.sugestao || val.text || val.content || JSON.stringify(val);
  }
  return String(val);
}

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

    const promptText = `Analise os dados técnicos do processo: ${JSON.stringify(rawProcess)}
    Retorne EXCLUSIVAMENTE um objeto JSON com campos: "resumo", "risco", "sugestao". 
    Todos os campos devem ser STRINGS de texto corrido. Não use arrays nem objetos internos.`;

    try {
      const openRouterRes = await callOpenRouter(promptText, true);
      const parsed = safeJsonParse(openRouterRes);
      
      return {
        success: true,
        cnj: cleanCnj,
        parecer: {
          resumo: ensureString(parsed?.resumo || "Erro no processamento do resumo."),
          risco: ensureString(parsed?.risco || "Erro no processamento do risco."),
          sugestao: ensureString(parsed?.sugestao || "Erro no processamento da sugestão.")
        },
        metadata
      };
    } catch (e: any) {
      return { success: false, error: `Erro no Motor AI: ${e.message}` };
    }
  }

  return { success: false, error: "Processo não encontrado no DataJud." };
}

export async function gerarRelatorioEstrategico(prompt: string) {
  try {
    return await callOpenRouter(prompt, false);
  } catch (e: any) {
    return `Erro de conexão com o motor estratégico: ${e.message}`;
  }
}
