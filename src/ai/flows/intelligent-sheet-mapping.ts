'use server';
/**
 * @fileOverview This file implements a Genkit flow for intelligently mapping Google Sheet headers to CRM fields.
 *
 * - intelligentSheetMapping - A function that suggests mappings between sheet headers and CRM fields.
 * - IntelligentSheetMappingInput - The input type for the intelligentSheetMapping function.
 * - IntelligentSheetMappingOutput - The return type for the intelligentSheetMapping function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligentSheetMappingInputSchema = z.object({
  sheetHeaders: z.array(z.string()).describe('An array of column headers from the Google Sheet.'),
  crmFields: z.array(z.string()).describe('An array of available CRM field names.'),
});
export type IntelligentSheetMappingInput = z.infer<typeof IntelligentSheetMappingInputSchema>;

const IntelligentSheetMappingOutputSchema = z.array(
  z.object({
    sheetHeader: z.string().describe('The original Google Sheet header.'),
    crmField: z.string().describe('The suggested CRM field, or "N/A" if no suitable match is found.'),
    confidenceScore: z.number().min(0.0).max(1.0).describe('A confidence score (0.0 to 1.0) for the mapping.'),
    reasoning: z.string().describe('A brief explanation for the suggested mapping.'),
  })
);
export type IntelligentSheetMappingOutput = z.infer<typeof IntelligentSheetMappingOutputSchema>;

export async function intelligentSheetMapping(input: IntelligentSheetMappingInput): Promise<IntelligentSheetMappingOutput> {
  return intelligentSheetMappingFlow(input);
}

const intelligentSheetMappingPrompt = ai.definePrompt({
  name: 'intelligentSheetMappingPrompt',
  input: { schema: IntelligentSheetMappingInputSchema },
  output: { schema: IntelligentSheetMappingOutputSchema },
  prompt: `You are an AI assistant specialized in mapping data fields.
Your task is to intelligently map Google Sheet column headers to a predefined list of CRM fields.

Here are the Google Sheet headers:
{{#each sheetHeaders}}
- "{{{this}}}"
{{/each}}

Here are the available CRM fields:
{{#each crmFields}}
- "{{{this}}}"
{{/each}}

For each Google Sheet header, find the most appropriate CRM field from the provided list.
If a suitable CRM field cannot be found, map it to "N/A".
Provide a confidence score for each mapping (from 0.0 to 1.0, where 1.0 is very confident).
Also, provide a brief reasoning for each mapping.

Output your response as a JSON array, where each element is an object with the following structure:
{
  "sheetHeader": "Original Google Sheet header string",
  "crmField": "Suggested CRM field string (or 'N/A' if no match)",
  "confidenceScore": "A float between 0.0 and 1.0",
  "reasoning": "A brief explanation for the mapping"
}

Example:
If sheetHeaders = ["Client Name", "Email Address"] and crmFields = ["Name", "Email", "Phone"]
Output should be:
[
  {
    "sheetHeader": "Client Name",
    "crmField": "Name",
    "confidenceScore": 0.95,
    "reasoning": "Client Name is semantically very close to Name."
  },
  {
    "sheetHeader": "Email Address",
    "crmField": "Email",
    "confidenceScore": 0.99,
    "reasoning": "Email Address and Email are direct matches."
  }
]
`,
});

const intelligentSheetMappingFlow = ai.defineFlow(
  {
    name: 'intelligentSheetMappingFlow',
    inputSchema: IntelligentSheetMappingInputSchema,
    outputSchema: IntelligentSheetMappingOutputSchema,
  },
  async (input) => {
    const { output } = await intelligentSheetMappingPrompt(input);
    return output!;
  }
);
