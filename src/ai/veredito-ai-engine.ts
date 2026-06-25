'use server';

/**
 * @fileOverview Gateway de Inteligência Veredito AI V30 - Arquitetura de Servidor Independente.
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const CLOUDFLARE_TOKEN = 'cfut_dnZDNCBK6D2hDfWBakHhqb0EHXUcOz9VdW0iB7Nj977eb0d0';
const CLOUDFLARE_ACCOUNT_ID = '938453762903';

function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(item => ensureString(item)).join("\n• ");
  if (typeof val === 'object') {
    if (val.resumo) return ensureString(val.resumo);
    if (val.risco) return ensureString(val.risco);
    if (val.sugestao) return ensureString(val.sugestao);
    return JSON.stringify(val);
  }
  return String(val);
}

async function executarMotorLocal(rawProcess: any) {
  const classe = ensureString(rawProcess.classe);
  const orgao = ensureString(rawProcess.orgaoJulgador);
  return {
    resumo: `Análise Heurística: Processo da classe ${classe} em ${orgao}.`,
    risco: "Risco Moderado: Avaliação estatística local.",
    sugestao: "Verificar movimentações no tribunal de origem."
  };
}

async function executarCloudflareAI(promptText: string) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'Você é um Analista Jurídico. Responda apenas em JSON: {"resumo": "...", "risco": "...", "sugestao": "..."}' },
          { role: 'user', content: promptText }
        ]
      }),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error("Cloudflare AI indisponível.");
    const data = await response.json();
    const parsed = safeJsonParse(data.result?.response || "");
    return {
      resumo: ensureString(parsed?.resumo || "Análise Cloudflare concluída."),
      risco: ensureString(parsed?.risco || "Risco operacional padrão."),
      sugestao: ensureString(parsed?.sugestao || "Seguir rito processual.")
    };
  } catch (e: any) {
    throw new Error("Falha no Cloudflare: " + e.message);
  }
}

export async function fetchProcessData(cnj: string) {
  const cleanCnj = cnj.replace(/\D/g, '');
  if (cleanCnj.length < 10) return { success: false, error: "CNJ Inválido." };

  const tr = cleanCnj.substring(14, 16);
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
    if (!response.ok) throw new Error(`DataJud (${alias.toUpperCase()}) indisponível.`);
    const result = await response.json();
    return { success: true, hits: result.hits?.hits || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function executarVereditoAI(cnj: string, engine: 'openrouter' | 'cloudflare' | 'local' | 'grok' = 'openrouter') {
  if (!cnj.trim()) return { success: false, error: "CNJ vazio." };

  try {
    const dados = await fetchProcessData(cnj);
    if (dados.success && dados.hits.length > 0) {
      const rawProcess = dados.hits[0]._source;
      const metadata = {
        orgao: ensureString(rawProcess.orgaoJulgador),
        classe: ensureString(rawProcess.classe),
        tribunal: ensureString(rawProcess.tribunal || "Tribunal de Justiça"),
        grau: ensureString(rawProcess.grau || "G1"),
        ultimaAtualizacao: rawProcess.dataHoraUltimaAtualizacao ? new Date(rawProcess.dataHoraUltimaAtualizacao).toLocaleString('pt-BR') : "Desconhecida"
      };

      if (engine === 'grok') {
        return { success: true, mode: 'client_handoff', cnj, metadata, rawProcess };
      }

      let parecer;
      const promptText = `Analise: ${JSON.stringify(rawProcess)}. Gere JSON: {"resumo": "...", "risco": "...", "sugestao": "..."}.`;

      if (engine === 'local') {
        parecer = await executarMotorLocal(rawProcess);
      } else if (engine === 'cloudflare') {
        parecer = await executarCloudflareAI(promptText);
      } else {
        const aiResponse = await callOpenRouter(promptText, true);
        const parsed = safeJsonParse(aiResponse);
        parecer = {
          resumo: ensureString(parsed?.resumo || "Análise concluída."),
          risco: ensureString(parsed?.risco || "Risco monitorado."),
          sugestao: ensureString(parsed?.sugestao || "Manter acompanhamento.")
        };
      }
      return { success: true, mode: 'server_complete', cnj, metadata, parecer };
    }
    return { success: false, error: "Processo não encontrado no DataJud." };
  } catch (e: any) {
    return { success: false, error: ensureString(e.message) };
  }
}
