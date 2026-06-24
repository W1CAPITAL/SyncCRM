/**
 * @fileOverview Configurações centrais para o OpenRouter AI.
 * Operação exclusiva via OpenAI GPT-4o Mini (Independente).
 */

export const OPENROUTER_MODEL = "openai/gpt-4o-mini";
// A chave é recuperada do ambiente para máxima segurança em produção
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

/**
 * Realiza uma chamada direta para a API do OpenRouter via fetch (Server-Side).
 */
export async function callOpenRouter(promptText: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Chave de API do OpenRouter não configurada no ambiente.');
  }

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
            content: 'Você é um Consultor Estratégico Sênior da W1 Capital. Analise dados jurídicos e responda EXCLUSIVAMENTE em formato JSON puro. O JSON deve conter obrigatoriamente os campos: "resumo" (string), "risco" (string) e "sugestao" (string). Não use blocos de código markdown nem arrays complexos.'
          },
          { role: 'user', content: promptText }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e: any) {
    console.error('OpenRouter Gateway Error:', e.message);
    throw new Error(`FALHA_CONEXAO_IA: ${e.message}`);
  }
}

/**
 * Limpa blocos de código markdown e converte para objeto de forma robusta.
 */
export function safeJsonParse(text: string) {
  try {
    if (!text) return null;
    
    // Remove qualquer resquício de markdown
    const cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
      
    const parsed = JSON.parse(cleanText);
    return parsed;
  } catch (e) {
    console.warn("Falha ao parsear JSON, tentando extração parcial:", text);
    return null;
  }
}
