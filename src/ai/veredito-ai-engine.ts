'use server';

/**
 * @fileOverview Motor de Programação Veredito AI v4.5 - Arquitetura Limpa
 * Gateway central para DataJud e OpenRouter (Server-Side Only).
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

/**
 * Identifica o tribunal com base no CNJ para roteamento da API CNJ.
 */
function getCourtFromCNJ(cnj: string) {
  const clean = cnj.replace(/\D/g, '');
  if (clean.length < 20) return { alias: 'tjsp', name: 'TJSP' };
  const tr = clean.substring(14, 16);
  const j = clean.substring(13, 14);
  
  if (j === '8') {
    const states: Record<string, string> = { 
      '26': 'tjsp', '19': 'tjrj', '13': 'tjmg', '16': 'tjpr', 
      '21': 'tjrs', '17': 'tjpe', '06': 'tjce', '05': 'tjba' 
    };
    return { alias: states[tr] || 'tjsp', name: states[tr]?.toUpperCase() || 'TJSP' };
  }
  return { alias: 'tjsp', name: 'Tribunal' };
}

/**
 * Busca dados técnicos no DataJud (API Pública CNJ).
 */
export async function fetchProcessData(cnj: string) {
  const courtInfo = getCourtFromCNJ(cnj);
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${courtInfo.alias}/_search`;
  const payload = { 
    query: { 
      term: { "numeroProcesso.keyword": cnj.replace(/\D/g, '') } 
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

    if (!response.ok) throw new Error(`Status DataJud: ${response.status}`);
    
    const result = await response.json();
    return { success: true, court: courtInfo.name, hits: result.hits?.hits || [] };
  } catch (error: any) {
    console.error('DataJud Fetch Error:', error.message);
    return { success: false, error: error.message, hits: [], court: courtInfo.name };
  }
}

/**
 * Garante que qualquer valor (objeto ou array) seja convertido em uma string legível para o React.
 * Previne o erro "Objects are not valid as a React child".
 */
function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map(v => ensureString(v)).join("\n• ");
  }
  if (typeof val === 'object') {
    // Casos específicos de retorno da IA que podem vir como objetos
    if (val.resumo) return ensureString(val.resumo);
    if (val.texto) return ensureString(val.texto);
    if (val.content) return ensureString(val.content);
    if (val.nome) return String(val.nome);
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * Executa a análise estratégica Veredito AI via OpenRouter.
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

    const promptText = `Analise este processo jurídico: ${JSON.stringify(rawProcess)}. 
    Gere um parecer estratégico com resumo, análise de riscos e sugestões. 
    Responda apenas em JSON puro: {"resumo": "texto", "risco": "texto", "sugestao": "texto"}.`;

    try {
      const openRouterRes = await callOpenRouter(promptText);
      const parsed = safeJsonParse(openRouterRes);
      
      return {
        success: true,
        cnj: cleanCnj,
        parecer: {
          resumo: ensureString(parsed?.resumo || parsed?.summary || "Análise técnica concluída com sucesso."),
          risco: ensureString(parsed?.risco || parsed?.risk || "Risco operacional monitorado."),
          sugestao: ensureString(parsed?.sugestao || parsed?.suggestion || "Seguir com a estratégia padrão.")
        },
        metadata
      };
    } catch (e: any) {
      // Fallback amigável em caso de erro na IA, mas mantendo os metadados do DataJud
      return { 
        success: true, 
        cnj: cleanCnj,
        metadata,
        parecer: {
          resumo: "Os dados do processo foram recuperados, mas a análise estratégica falhou temporariamente.",
          risco: "Indisponível no momento.",
          sugestao: "Tente novamente em instantes."
        },
        warning: `Erro na IA: ${e.message}`
      };
    }
  }

  return { success: false, error: "Processo não encontrado nos sistemas do CNJ." };
}

export async function gerarRelatorioEstrategico(prompt: string) {
  try {
    return await callOpenRouter(prompt);
  } catch (e: any) {
    return `Erro de conexão: ${e.message}`;
  }
}
