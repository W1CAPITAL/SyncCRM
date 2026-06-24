'use server';

/**
 * @fileOverview Motor de Programação Veredito IA v3.5
 * Integração DataJud (CNJ) + Lógica Cognitiva Gemini 2.5.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

/**
 * Identifica o alias do tribunal a partir do número CNJ
 */
function getCourtFromCNJ(cnj: string) {
  const clean = cnj.replace(/\D/g, '');
  if (clean.length < 20) return { alias: 'tjsp', name: 'TJSP' };

  const j = clean.substring(13, 14); // Justiça
  const tr = clean.substring(14, 16); // Tribunal/Região

  if (j === '8') {
    const states: Record<string, string> = {
      '26': 'tjsp', '19': 'tjrj', '13': 'tjmg', '16': 'tjpr', '21': 'tjrs',
      '01': 'tjac', '02': 'tjal', '03': 'tjam', '04': 'tjap', '05': 'tjba',
      '06': 'tjce', '07': 'tjdf', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
      '11': 'tjmt', '12': 'tjms', '14': 'tjpa', '15': 'tjpb', '17': 'tjpe',
      '18': 'tjpi', '20': 'tjrn', '22': 'tjro', '23': 'tjrr', '24': 'tjsc',
      '25': 'tjse', '27': 'tjto'
    };
    return { alias: states[tr] || 'tjsp', name: 'Justiça Estadual' };
  }
  if (j === '4') return { alias: 'trf' + tr, name: 'Justiça Federal' };
  if (j === '5') return { alias: 'trt' + tr, name: 'Justiça do Trabalho' };
  
  return { alias: 'tjsp', name: 'Tribunal de Justiça' };
}

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

const AnalysisOutputSchema = z.object({
  sintese: z.string().describe('Resumo executivo do caso.'),
  resolucao: z.string().describe('Sugestão de próximo passo ou resolução.'),
  dica: z.string().describe('Dica estratégica para o advogado.'),
});

const analyzeProcessPrompt = ai.definePrompt({
  name: 'analyzeProcessPrompt',
  input: { schema: z.object({ rawData: z.any() }) },
  output: { schema: AnalysisOutputSchema },
  prompt: `Você é um Consultor Jurídico Sênior da W1 Capital.
Analise os seguintes dados técnicos de um processo vindos do DataJud (CNJ):
{{{json rawData}}}

Forneça:
1. Uma síntese clara da situação atual.
2. Uma sugestão técnica de resolução ou próximo passo.
3. Uma dica estratégica baseada no tribunal ou tipo de processo.

Seja direto, profissional e focado em resultados rápidos.`,
});

export async function executarVereditoAI(cnj: string) {
  const cleanCnj = cnj.trim();
  if (!cleanCnj) return { sintese: "CNJ inválido.", dados: { hits: [] } };

  const dados = await fetchProcessData(cleanCnj);
  
  if (dados.success && dados.hits.length > 0) {
    const { output } = await analyzeProcessPrompt({ rawData: dados.hits[0] });
    return {
      sintese: output?.sintese || "Dados recuperados com sucesso.",
      resolucao: output?.resolucao || "Aguardando análise profunda.",
      dica: output?.dica || "Mantenha o monitoramento ativo.",
      dados,
      timestamp: new Date().toISOString()
    };
  }

  return {
    sintese: dados.success ? "Nenhuma movimentação pública detalhada encontrada para este CNJ." : `Erro no motor: ${dados.error}`,
    resolucao: "Verificar se o processo corre em segredo de justiça ou se o tribunal está offline.",
    dica: "Tente consultar o site do tribunal diretamente para detalhes não públicos.",
    dados,
    timestamp: new Date().toISOString()
  };
}

export async function gerarRelatorioEstrategico(prompt: string) {
  const reportPrompt = ai.definePrompt({
    name: 'reportPrompt',
    input: { schema: z.object({ texto: z.string() }) },
    output: { schema: z.string() },
    prompt: `Você é o Arquiteto de Soluções da W1 Capital. 
Gere um relatório estratégico de alta fidelidade baseado no seguinte comando:
{{{texto}}}

Use uma linguagem executiva, estruturada em tópicos e com foco em conformidade e eficiência técnica.`,
  });

  const { output } = await reportPrompt({ texto: prompt });
  return output || "Falha ao gerar relatório.";
}
