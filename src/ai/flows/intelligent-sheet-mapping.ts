
'use server';
/**
 * @fileOverview Mapeador Inteligente de Planilhas (OpenRouter Native)
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

export type IntelligentSheetMappingInput = {
  sheetHeaders: string[];
  crmFields: string[];
};

export type IntelligentSheetMappingOutput = Array<{
  sheetHeader: string;
  crmField: string;
  confidenceScore: number;
  reasoning: string;
}>;

export async function intelligentSheetMapping(input: IntelligentSheetMappingInput): Promise<IntelligentSheetMappingOutput> {
  const prompt = `Mapeie os cabeçalhos da planilha para os campos do CRM.
Headers: ${JSON.stringify(input.sheetHeaders)}
Fields: ${JSON.stringify(input.crmFields)}

Retorne um array JSON de objetos: {sheetHeader, crmField, confidenceScore, reasoning}.`;

  try {
    const response = await callOpenRouter(prompt, true);
    return safeJsonParse(response) || [];
  } catch (e) {
    console.error('Mapping Error:', e);
    return [];
  }
}
