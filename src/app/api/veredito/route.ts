
import { NextResponse } from 'next/server';
import { processarVeredito } from '@/ai/veredito-ai-engine';

/**
 * Força a execução na Edge Runtime para compatibilidade total com Cloudflare.
 * Isso resolve o erro de 'Failed to produce a Cloudflare Pages build'.
 */
export const runtime = 'edge';

/**
 * Gateway de API - Evita erro 405 Method Not Allowed em servidores estáticos.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnj, engine } = body;

    if (!cnj) {
      return NextResponse.json({ success: false, error: "CNJ obrigatório." }, { status: 400 });
    }

    const result = await processarVeredito(cnj, engine || 'openrouter');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: "Erro interno no gateway." }, { status: 500 });
  }
}
