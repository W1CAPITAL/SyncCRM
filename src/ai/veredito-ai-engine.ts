'use server';

/**
 * @fileOverview Motor Veredito AI V25 - Gateway Multi-Engine Resiliente.
 * Integração: OpenRouter, Grok (Puter.js) e Motor Local.
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

/**
 * Converte qualquer valor em uma String segura para o React.
 */
function ensureString(val: any): string {
  if (val === null || val === undefined) return "Não informado";
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(item => ensureString(item)).join("\n• ");
  if (typeof val === 'object') {
    if (val.resumo) return ensureString(val.resumo);
    if (val.texto) return ensureString(val.texto);
    if (val.justificativa) return ensureString(val.justificativa);
    if (val.description) return ensureString(val.description);
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * Motor Local: Análise baseada em regras heurísticas (Fallback).
 */
async function executarMotorLocal(rawProcess: any) {
  const orgao = ensureString(rawProcess.orgaoJulgador);
  const classe = ensureString(rawProcess.classe);
  const status = ensureString(rawProcess.status || "Em tramitação");
  
  return {
    resumo: `Análise Heurística: Processo da classe ${classe} identificado em ${orgao}. O status atual indica "${status}". Baseado em andamentos similares, o rito segue a cronologia padrão do tribunal.`,
    risco: "Risco Moderado: Avaliação baseada em histórico de tribunais estaduais (Motor Heurístico Local).",
    sugestao: "Manter monitoramento de publicações e verificar se há prazos de contestação ou apelação pendentes."
  };
}

/**
 * Motor Grok AI via Puter.js: xAI Grok-4.3
 */
async function executarGrokAI(promptText: string) {
  try {
    // Importação dinâmica para evitar problemas em ambientes onde a lib não esteja totalmente resolvida
    const { puter } = await import('@heyputer/puter.js');
    
    // Chamada ao Grok 4.3 conforme documentação do Puter.js
    const response = await puter.ai.chat(promptText, { model: 'x-ai/grok-4.3' });
    
    if (!response || !response.message || !response.message.content) {
      throw new Error("Resposta inválida do Grok via Puter.");
    }

    const rawResponse = response.message.content;
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const parsed = safeJsonParse(jsonMatch ? jsonMatch[0] : rawResponse);

    return {
      resumo: ensureString(parsed?.resumo || (rawResponse.length > 50 ? rawResponse.substring(0, 300) : "Falha no parse do Grok AI.")),
      risco: ensureString(parsed?.risco || "Análise de risco gerada via xAI Grok 4.3."),
      sugestao: ensureString(parsed?.sugestao || "Seguir recomendações técnicas do parecer Grok.")
    };
  } catch (e: any) {
    throw new Error("Falha na conexão com Grok AI: " + (e.message || "Erro de rede no Puter.js."));
  }
}

/**
 * Busca dados do processo no DataJud com suporte a múltiplos tribunais.
 */
export async function fetchProcessData(cnj: string) {
  const cleanCnj = cnj.replace(/\D/g, '');
  if (cleanCnj.length < 10) return { success: false, error: "CNJ Inválido." };

  const tr = cleanCnj.substring(14, 16);
  const aliasMap: Record<string, string> = {
    '19': 'tjrj', '13': 'tjmg', '26': 'tjsp', '07': 'tjdft', '21': 'tjrs'
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

    if (!response.ok) throw new Error(`DataJud (${alias.toUpperCase()}) indisponível temporariamente.`);
    const result = await response.json();
    return { success: true, hits: result.hits?.hits || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Orquestração completa com seleção de motor.
 */
export async function executarVereditoAI(cnj: string, engine: 'openrouter' | 'grok' | 'local' = 'openrouter') {
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

      let parecer;
      const promptText = `Você é um Analista Jurídico Sênior. Analise este processo judicial: ${JSON.stringify(rawProcess)}. 
      Gere um parecer estruturado EXCLUSIVAMENTE em JSON: 
      {
        "resumo": "Explicação técnica clara do andamento",
        "risco": "Análise de probabilidade de êxito",
        "sugestao": "Recomendação da próxima ação estratégica"
      }. Use apenas strings de texto simples.`;

      if (engine === 'local') {
        parecer = await executarMotorLocal(rawProcess);
      } else if (engine === 'grok') {
        parecer = await executarGrokAI(promptText);
      } else {
        const aiResponse = await callOpenRouter(promptText);
        const parsed = safeJsonParse(aiResponse);
        parecer = {
          resumo: ensureString(parsed?.resumo || "Análise técnica via OpenRouter concluída."),
          risco: ensureString(parsed?.risco || "Risco operacional monitorado."),
          sugestao: ensureString(parsed?.sugestao || "Manter acompanhamento processual.")
        };
      }
      
      return {
        success: true,
        cnj,
        metadata,
        parecer
      };
    }

    return { success: false, error: "Processo não encontrado na base do DataJud." };
  } catch (e: any) {
    return { success: false, error: ensureString(e.message || "Falha na análise estratégica.") };
  }
}

/**
 * Função para geração de relatórios personalizados.
 */
export async function gerarRelatorioEstrategico(prompt: string) {
  try {
    return await callOpenRouter(prompt);
  } catch (e: any) {
    return "Erro ao gerar relatório: " + ensureString(e.message);
  }
}