import { NextResponse } from 'next/server';
import { gerarRespostaWhatsApp } from '@/ai/veredito-ai-engine';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mensagem, contexto, tom } = body;

    if (!contexto) {
      return NextResponse.json({ success: false, error: "Contexto obrigatório." }, { status: 400 });
    }

    const result = await gerarRespostaWhatsApp(mensagem, contexto, tom || 'juridico');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("WhatsApp AI API Error:", error);
    return NextResponse.json({ success: false, error: "Erro interno no gateway WhatsApp AI." }, { status: 500 });
  }
}
