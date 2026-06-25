import { NextResponse } from 'next/server';
import { processarVeredito } from '@/ai/veredito-ai-engine';

/**
 * API Route para evitar erro 405 (Method Not Allowed) em hosts estáticos como Cloudflare Pages.
 * Esta rota atua como o gateway dinâmico para o processamento de IA.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnj, engine } = body;

    if (!cnj) {
      return NextResponse.json({ success: false, error: "CNJ é obrigatório." }, { status: 400 });
    }

    const result = await processarVeredito(cnj, engine || 'openrouter');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro na API de Veredito:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
