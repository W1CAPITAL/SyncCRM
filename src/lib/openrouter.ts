
/**
 * @fileOverview Gateway de Inteligência V51 Elite - Independência Total.
 */

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

/**
 * Base de Dados de CNPJs Bancários (V51 Elite)
 * Evita que a IA invente dados.
 */
const BANK_CNPJ_MAP: Record<string, string> = {
  "PAN": "59.285.411/0001-13",
  "BANCO PAN": "59.285.411/0001-13",
  "VOTORANTIM": "00.312.378/0001-29",
  "BANCO VOTORANTIM": "00.312.378/0001-29",
  "BV": "00.312.378/0001-29",
  "ITAÚ": "60.701.190/0001-04",
  "ITAU": "60.701.190/0001-04",
  "BRADESCO": "60.746.948/0001-12",
  "SANTANDER": "90.400.888/0001-42",
  "BANCO DO BRASIL": "00.000.000/0001-91",
  "CAIXA": "00.360.305/0001-04",
  "CAIXA ECONOMICA": "00.360.305/0001-04",
  "BMG": "33.171.211/0001-51",
  "SAFRA": "58.160.789/0001-28"
};

/**
 * Busca o CNPJ real de um banco.
 */
export function getBankCNPJ(bankName: string): string {
  const upperName = bankName.toUpperCase();
  for (const [key, cnpj] of Object.entries(BANK_CNPJ_MAP)) {
    if (upperName.includes(key)) return cnpj;
  }
  return "CNPJ NÃO LOCALIZADO";
}

/**
 * Chamada direta para o OpenRouter via Fetch Nativo (Server-Side).
 */
export async function callOpenRouter(promptText: string, isJson: boolean = false) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'SyncCRM W1 Capital Elite',
        'HTTP-Referer': 'https://synccrm.pages.dev'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { 
            role: 'system', 
            content: isJson 
              ? 'AJA COMO: Diretor de Operações Jurídicas Sênior. PROIBIDO USAR MARKDOWN. RESPONDA APENAS EM JSON PURO.' 
              : 'Você é um Estrategista Jurídico Sênior e Diretor de Legal Ops do SyncCRM. PROIBIDO USAR MARKDOWN. Responda em texto limpo com parágrafos.' 
          },
          { role: 'user', content: promptText }
        ],
        temperature: 0.1
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error("Falha na IA:", error.message);
    throw error;
  }
}

export function safeJsonParse(text: string) {
  try {
    if (!text) return null;
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}
