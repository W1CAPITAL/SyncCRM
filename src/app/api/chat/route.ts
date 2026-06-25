import { NextResponse } from 'next/server';
import { processarChat } from '@/ai/veredito-ai-engine';

/**
 * Força a execução na Edge Runtime para compatibilidade total com Cloudflare.
 */
export const runtime = 'edge';

/**
 * Gateway de API para Chat Geral.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mensagem, historico, engine } = body;

    if (!mensagem) {
      return NextResponse.json({ success: false, error: "Mensagem obrigatória." }, { status: 400 });
    }

    const result = await processarChat(mensagem, historico || [], engine || 'openrouter');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ success: false, error: "Erro interno no gateway de chat." }, { status: 500 });
  }
}
