
/**
 * @fileOverview Configurações centrais para o OpenRouter AI.
 * Operação exclusiva via OpenAI GPT-4o Mini.
 */

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_API_KEY = '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';

/**
 * Realiza uma chamada direta para a API do OpenRouter via fetch.
 * Independente de bibliotecas externas como Genkit.
 */
export async function callOpenRouter(promptText: string, jsonMode: boolean = false) {
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
            content: 'Você é um Consultor Estratégico Sênior da W1 Capital. Responda de forma clara, profissional e técnica.' + (jsonMode ? ' Responda estritamente em formato JSON puro, sem markdown, sem explicações extras.' : '')
          },
          { role: 'user', content: promptText }
        ],
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        temperature: 0.2
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Erro de conexão com o OpenRouter');
    }

    return data.choices?.[0]?.message?.content || '';
  } catch (e: any) {
    console.error('OpenRouter Error:', e.message);
    throw e;
  }
}

/**
 * Limpa blocos de código markdown e converte para objeto.
 */
export function safeJsonParse(text: string) {
  try {
    if (!text) return null;
    const cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Falha ao parsear JSON:", text);
    return null;
  }
}
