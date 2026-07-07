import { NextResponse } from 'next/server';
import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

export const runtime = 'edge';

/**
 * API Neural V80 Master - IA assume o controle total dos cálculos e métricas.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metrics, rawData, isFullNeural, engine } = body;

    if (!metrics && !rawData) {
      return NextResponse.json({ success: false, error: "Dados ausentes para análise." }, { status: 400 });
    }

    // Se isFullNeural for true, a IA deve calcular TUDO
    const promptText = isFullNeural 
      ? `AJA COMO: Motor de Processamento Jurídico Neural (V80). 
         VOCÊ RECEBEU DADOS BRUTOS DE UMA PLANILHA: ${JSON.stringify(rawData).substring(0, 10000)}
         SUA MISSÃO É CALCULAR OS NÚMEROS DO DASHBOARD:
         1. TOTAL ATIVOS (Ignorando encerrados).
         2. URGÊNCIA MÁXIMA (Baseado na Coluna N - Próximo Prazo vencido há mais de 5 dias ou com termos críticos).
         3. ATRASOS COMUNS (Vencidos há menos de 5 dias).
         4. PRAZOS HOJE.
         5. SCORE DE EFICIÊNCIA (0-100%).

         RETORNE APENAS JSON PURO:
         {
           "totalAtivos": number,
           "urgenciaMaxima": number,
           "atrasosComuns": number,
           "prazosHoje": number,
           "score": number,
           "parecer": "Texto limpo e direto da sua análise estratégica sobre esses números."
         }`
      : `AJA COMO: Diretor Geral de Estratégia Jurídica (W1 Capital). 
         ANALISE ESTAS MÉTRICAS REAIS DO GABINETE:
         - TOTAL ATIVOS: ${metrics.activePortfolio?.length || 0}
         - URGÊNCIA MÁXIMA (COLUNA N): ${metrics.reallyOverdue?.length || 0}
         - ATRASOS COMUNS: ${metrics.commonOverdue?.length || 0}
         - PRAZOS HOJE: ${metrics.todayPrazos?.length || 0}
         - EFICIÊNCIA OPERACIONAL: ${metrics.efficiencyScore || 0}%

         SUA MISSÃO:
         1. Informe os números acima de forma executiva.
         2. Dê um parecer cirúrgico sobre o risco operacional (foco na Urgência Máxima).
         3. Determine o Plano de Ação para HOJE.
         
         PROIBIDO USAR MARKDOWN. RESPONDA EM TEXTO LIMPO E DIRETO.`;

    const aiResponse = await callOpenRouter(promptText, isFullNeural);
    
    if (isFullNeural) {
      const parsed = safeJsonParse(aiResponse);
      return NextResponse.json({ 
        success: true, 
        isFullNeural: true,
        metrics: {
          totalAtivos: parsed?.totalAtivos || 0,
          urgenciaMaxima: parsed?.urgenciaMaxima || 0,
          atrasosComuns: parsed?.atrasosComuns || 0,
          prazosHoje: parsed?.prazosHoje || 0,
          efficiency: parsed?.score || 0,
          analysis: parsed?.parecer || "Processamento neural concluído."
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      analysis: aiResponse.replace(/\*\*/g, '').replace(/###/g, '').trim() 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
