'use server';
/**
 * @fileOverview A Genkit flow for monitoring structural changes in Google Sheets.
 *
 * - sheetStructureMonitor - A function that detects structural changes in a Google Sheet.
 * - SheetStructureMonitorInput - The input type for the sheetStructureMonitor function.
 * - SheetStructureMonitorOutput - The return type for the sheetStructureMonitor function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the schema for a single sheet's structure
const SheetSchema = z.object({
  sheetName: z.string().describe('The name of the sheet (tab).'),
  headers: z.array(z.string()).describe('An array of column headers for this sheet.'),
});

// Define the overall schema for the spreadsheet structure
const SheetStructureSchema = z.object({
  sheets: z.array(SheetSchema).describe('An array of sheet structures within the spreadsheet.'),
});

// Define the input schema for the sheet structure monitor flow
const SheetStructureMonitorInputSchema = z.object({
  previousSheetStructure: SheetStructureSchema.describe('The previously known or expected structure of the Google Sheet, including all sheets and their headers.'),
  currentSheetStructure: SheetStructureSchema.describe('The current structure of the Google Sheet, including all sheets and their headers.'),
});
export type SheetStructureMonitorInput = z.infer<typeof SheetStructureMonitorInputSchema>;

// Define the output schema for the sheet structure monitor flow
const SheetStructureMonitorOutputSchema = z.object({
  hasChanged: z.boolean().describe('True if any structural changes (added/removed sheets, added/removed/renamed columns) were detected between the previous and current sheet structure.'),
  changesDetected: z.string().describe('A detailed, human-readable description of the structural changes detected, if any. This field will be "No structural changes detected." if no changes were found.'),
});
export type SheetStructureMonitorOutput = z.infer<typeof SheetStructureMonitorOutputSchema>;

// Define the prompt for the AI model
const sheetStructureMonitorPrompt = ai.definePrompt({
  name: 'sheetStructureMonitorPrompt',
  input: { schema: SheetStructureMonitorInputSchema },
  output: { schema: SheetStructureMonitorOutputSchema },
  prompt: `You are an intelligent assistant designed to monitor structural changes in Google Sheets.
Your task is to meticulously compare two spreadsheet structures provided: a 'previous' structure and a 'current' structure.
Identify any differences in sheet names or column headers within each sheet.

Previous Sheet Structure:
\`\`\`json
{{json previousSheetStructure}}
\`\`\`

Current Sheet Structure:
\`\`\`json
{{json currentSheetStructure}}
\`\`\`

Analyze the differences and summarize them concisely.
If there are no structural changes at all, respond with:
\`\`\`json
{
  "hasChanged": false,
  "changesDetected": "No structural changes detected."
}
\`\`\`
Otherwise, describe all detected changes clearly and accurately. For each change, specify:
1.  **Which sheet** was affected (e.g., "Sheet 'Clients'").
2.  **What type of change** occurred (e.g., "added", "removed", "renamed", "reordered headers").
3.  **Specific elements** involved (e.g., "column 'Email'", "sheet 'Archive'").
Focus on identifying distinct structural alterations such as:
-   Addition or removal of entire sheets.
-   Renaming of sheets.
-   Addition or removal of columns within a sheet.
-   Renaming of columns within a sheet.
-   Significant reordering of columns (mention if the order has changed significantly even if columns are the same).

Prioritize clarity and conciseness in your summary.

Example of a detailed change description:
"Sheet 'Customers': Column 'Address Line 2' was removed. Sheet 'Products': Column 'SKU' was added, 'Item Name' was renamed to 'Product Name'. Sheet 'Archived Data' was added."`,
});

// Define the Genkit flow
const sheetStructureMonitorFlow = ai.defineFlow(
  {
    name: 'sheetStructureMonitorFlow',
    inputSchema: SheetStructureMonitorInputSchema,
    outputSchema: SheetStructureMonitorOutputSchema,
  },
  async (input) => {
    const { output } = await sheetStructureMonitorPrompt(input);
    return output!;
  }
);

// Wrapper function to expose the flow
export async function sheetStructureMonitor(input: SheetStructureMonitorInput): Promise<SheetStructureMonitorOutput> {
  return sheetStructureMonitorFlow(input);
}
