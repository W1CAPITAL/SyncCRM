/**
 * @fileOverview Gateway OpenRouter AI - Arquitetura de Resiliência Dupla.
 */

// Tenta carregar do .env (extraído pelo Firebase ou local) ou usa o fallback hardcoded funcional
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "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";
export const OPENROUTER_MODEL = "openai/gpt-4o-mini";

/**
 * Chamada direta para o OpenRouter utilizando Fetch Nativo do lado do Servidor.
 */
export async function callOpenRouter(promptText: string, isJson: boolean = false) {
  if (!OPENROUTER_API_KEY) {
    console.error("ERRO CRÍTICO: Chave OpenRouter não configurada.");
    throw new Error('API Key do OpenRouter ausente.');
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://w1capital.crmsync.com', // Obrigatório para alguns modelos
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
      const msg = err?.error?.message || `Erro HTTP ${response.status}`;
      console.error("Falha OpenRouter:", msg);
      throw new Error(msg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error("Erro Conexão OpenRouter:", error.message);
    throw error;
  }
}

export function safeJsonParse(text: string) {
  try {
    if (!text) return null;
    // Limpa possíveis marcações de markdown da IA
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.warn("Falha ao parsear JSON da IA:", text);
    return null;
  }
}
