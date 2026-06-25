/**
 * @fileOverview Gateway OpenRouter AI - Arquitetura Independente.
 */

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
// Chave integrada para garantir funcionamento fora do ambiente Firebase
export const OPENROUTER_API_KEY = "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";

/**
 * Chamada direta para o OpenRouter utilizando Fetch Nativo do lado do Servidor.
 */
export async function callOpenRouter(promptText: string, isJson: boolean = false) {
  if (!OPENROUTER_API_KEY) throw new Error('API Key do OpenRouter ausente.');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://w1capital.crmsync.com',
        'X-Title': 'SyncCRM W1 Capital Elite'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { 
            role: 'system', 
            content: isJson 
              ? 'Você é um Analista Estratégico. Responda APENAS em JSON puro: {"resumo": "...", "risco": "...", "sugestao": "..."}.' 
              : 'Você é um Analista Jurídico Sênior.' 
          },
          { role: 'user', content: promptText }
        ],
        temperature: 0.1
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || 'Erro na comunicação com a IA');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error("Erro callOpenRouter:", error.message);
    throw error;
  }
}

export function safeJsonParse(text: string) {
  try {
    if (!text) return null;
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}
