'use server';

/**
 * @fileOverview Motor Veredito AI V12 - Arquitetura Totalmente Independente.
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

/**
 * Garante que qualquer valor (objeto, array ou null) seja convertido em uma String segura para o React.
 */
function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join("\n• ");
  if (typeof val === 'object') {
    // Se for um objeto complexo retornado pela IA ou DataJud, tenta extrair a mensagem principal
    if (val.resumo) return ensureString(val.resumo);
    if (val.texto) return ensureString(val.texto);
    if (val.justificativa) return ensureString(val.justificativa);
    if (val.description) return ensureString(val.description);
    return JSON.stringify(val);
  }
  return String(val);
}

export async function fetchProcessData(cnj: string) {
  const cleanCnj = cnj.replace(/\D/g, '');
  if (cleanCnj.length < 10) return { success: false, error: "CNJ Inválido." };

  const tr = cleanCnj.substring(14, 16) || '26';
  const alias = tr === '19' ? 'tjrj' : tr === '13' ? 'tjmg' : 'tjsp';
  
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

    if (!response.ok) throw new Error(`DataJud offline: ${response.status}`);
    const result = await response.json();
    return { success: true, hits: result.hits?.hits || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function executarVereditoAI(cnj: string) {
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

      const promptText = `Analise tecnicamente este processo judicial: ${JSON.stringify(rawProcess)}. 
      Gere um parecer estruturado em JSON com os campos: 
      "resumo" (explicação do status atual), 
      "risco" (análise de probabilidade de perda/ganho), 
      "sugestao" (próximo passo estratégico). 
      Use apenas texto simples nos valores.`;

      const aiResponse = await callOpenRouter(promptText);
      const parsed = safeJsonParse(aiResponse);
      
      return {
        success: true,
        cnj,
        metadata,
        parecer: {
          resumo: ensureString(parsed?.resumo || "Análise técnica processada."),
          risco: ensureString(parsed?.risco || "Risco operacional padrão."),
          sugestao: ensureString(parsed?.sugestao || "Manter monitoramento ativo.")
        }
      };
    }

    return { success: false, error: "Processo não encontrado na base DataJud." };
  } catch (e: any) {
    return { success: false, error: "Falha crítica no motor AI: " + e.message };
  }
}

export async function gerarRelatorioEstrategico(prompt: string) {
  return await callOpenRouter(prompt);
}
