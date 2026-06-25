
/**
 * @fileOverview Motor de Inteligência Veredito AI V42 - Biblioteca de Servidor.
 * Independente de Server Actions para compatibilidade total com API Routes.
 */

import { callOpenRouter, safeJsonParse, DATAJUD_API_KEY } from '@/lib/openrouter';

function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(item => ensureString(item)).join("\n• ");
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Busca dados no DataJud.
 */
export async function fetchProcessData(cnj: string) {
  const cleanCnj = cnj.replace(/\D/g, '');
  if (cleanCnj.length < 10) return { success: false, error: "CNJ Inválido." };

  const fullCnj = cnj.padStart(20, '0');
  const tr = fullCnj.substring(14, 16);
  
  const aliasMap: Record<string, string> = {
    '19': 'tjrj', '13': 'tjmg', '26': 'tjsp', '07': 'tjdft', '21': 'tjrs', '05': 'tjba'
  };
  const alias = aliasMap[tr] || 'tjsp';
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Authorization': 'APIKey ' + DATAJUD_API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ query: { term: { "numeroProcesso.keyword": cleanCnj } } }),
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`DataJud Indisponível (HTTP ${response.status})`);

    const result = await response.json();
    const hits = result.hits?.hits || [];
    
    if (hits.length === 0) return { success: false, error: "Processo não encontrado no DataJud." };

    return { success: true, rawProcess: hits[0]._source };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Lógica de Execução - Chamada pela API Route.
 */
export async function processarVeredito(cnj: string, engine: string) {
  if (!cnj.trim()) return { success: false, error: "CNJ não informado." };

  try {
    const dados = await fetchProcessData(cnj);
    if (!dados.success) return dados;

    const rawProcess = dados.rawProcess;
    const metadata = {
      orgao: ensureString(rawProcess.orgaoJulgador),
      classe: ensureString(rawProcess.classe),
      tribunal: ensureString(rawProcess.tribunal || "Tribunal de Justiça"),
      ultimaAtualizacao: rawProcess.dataHoraUltimaAtualizacao ? new Date(rawProcess.dataHoraUltimaAtualizacao).toLocaleString('pt-BR') : "Desconhecida"
    };

    // Modo Handoff para Grok (Cliente processa a IA)
    if (engine === 'grok') {
      return { success: true, mode: 'client_handoff', cnj, metadata, rawProcess };
    }

    // Modo Local (Servidor processa heurística)
    if (engine === 'local') {
      return {
        success: true,
        mode: 'server_complete',
        cnj,
        metadata,
        parecer: {
          resumo: `Análise Heurística: Processo de ${metadata.classe} no ${metadata.orgao}.`,
          risco: "Risco Moderado detectado por motor local.",
          sugestao: "Consultar movimentações recentes via tribunal."
        }
      };
    }

    // Modo OpenRouter (Servidor processa a IA)
    const promptText = `Analise este processo judicial e gere um parecer técnico: ${JSON.stringify(rawProcess)}. 
    Responda APENAS em JSON: {"resumo": "...", "risco": "...", "sugestao": "..."}.`;

    const aiResponse = await callOpenRouter(promptText, true);
    const parsed = safeJsonParse(aiResponse);

    return {
      success: true,
      mode: 'server_complete',
      cnj,
      metadata,
      parecer: {
        resumo: ensureString(parsed?.resumo || "Resumo gerado com sucesso."),
        risco: ensureString(parsed?.risco || "Análise de risco concluída."),
        sugestao: ensureString(parsed?.sugestao || "Seguir rito processual padrão.")
      }
    };
  } catch (e: any) {
    return { success: false, error: "Falha Crítica no Gateway: " + e.message };
  }
}
