'use server';
/**
 * @fileOverview Mapeador Inteligente - Independente de Genkit.
 */
import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

export type IntelligentSheetMappingInput = {
  sheetHeaders: string[];
  crmFields: string[];
};

export async function intelligentSheetMapping(input: IntelligentSheetMappingInput) {
  const prompt = `Mapeie cabeçalhos: ${JSON.stringify(input.sheetHeaders)} para campos: ${JSON.stringify(input.crmFields)}. Retorne array JSON: {sheetHeader, crmField, confidenceScore, reasoning}.`;
  try {
    const res = await callOpenRouter(prompt, true);
    return safeJsonParse(res) || [];
  } catch (e) {
    return [];
  }
}
