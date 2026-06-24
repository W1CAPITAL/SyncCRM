/**
 * @fileOverview Gateway OpenRouter AI - Arquitetura Limpa (Nativo Fetch).
 */

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_API_KEY = "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";

/**
 * Chamada direta para o OpenRouter utilizando Fetch Nativo.
 */
export async function callOpenRouter(promptText: string) {
  if (!OPENROUTER_API_KEY) throw new Error('API Key do OpenRouter ausente.');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://w1capital.crmsync.com',
        'X-Title': 'SyncCRM W1 Capital'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'Você é um Analista Estratégico Sênior Jurídico. Responda APENAS em JSON puro: {"resumo": "...", "risco": "...", "sugestao": "..."}. O campo sugestao deve ser uma string única, use \n para pular linhas se necessário. Não use Markdown.' 
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
