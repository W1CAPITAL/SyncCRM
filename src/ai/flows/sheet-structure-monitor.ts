
'use server';
/**
 * @fileOverview Monitor de Estrutura de Planilhas (OpenRouter Native)
 */

import { callOpenRouter, safeJsonParse } from '@/lib/openrouter';

export type SheetStructureMonitorInput = {
  previousSheetStructure: any;
  currentSheetStructure: any;
};

export type SheetStructureMonitorOutput = {
  hasChanged: boolean;
  changesDetected: string;
};

export async function sheetStructureMonitor(input: SheetStructureMonitorInput): Promise<SheetStructureMonitorOutput> {
  const prompt = `Compare as estruturas das planilhas e identifique mudanças.
Anterior: ${JSON.stringify(input.previousSheetStructure)}
Atual: ${JSON.stringify(input.currentSheetStructure)}

Retorne JSON: {hasChanged: boolean, changesDetected: string}.`;

  try {
    const response = await callOpenRouter(prompt, true);
    return safeJsonParse(response) || { hasChanged: false, changesDetected: "Erro no processamento." };
  } catch (e) {
    return { hasChanged: false, changesDetected: "Falha de conexão." };
  }
}
