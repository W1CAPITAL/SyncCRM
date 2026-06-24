'use server';
/**
 * @fileOverview Monitor de Estrutura - Independente de Genkit.
 */
import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

export async function sheetStructureMonitor(input: any) {
  const prompt = `Compare estruturas de planilhas e identifique mudanças. Retorne JSON: {hasChanged: boolean, changesDetected: string}.`;
  try {
    const res = await callOpenRouter(prompt, true);
    return safeJsonParse(res) || { hasChanged: false, changesDetected: "Erro." };
  } catch (e) {
    return { hasChanged: false, changesDetected: "Falha." };
  }
}
