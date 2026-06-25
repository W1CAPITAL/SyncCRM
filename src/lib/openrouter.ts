
/**
 * @fileOverview Gateway de Inteligência - Arquitetura de Independência Total.
 */

// Chaves embutidas como fallback para garantir funcionamento imediato fora do Firebase
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

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
              ? 'Você é um Analista Estratégico. Responda APENAS em JSON: {"resumo": "...", "risco": "...", "sugestao": "..."}.' 
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
