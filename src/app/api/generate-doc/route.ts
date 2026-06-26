
import { NextResponse } from 'next/server';
import { processarProcuracao } from '@/ai/veredito-ai-engine';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dadosBrutos } = body;

    if (!dadosBrutos) {
      return NextResponse.json({ success: false, error: "Dados brutos obrigatórios." }, { status: 400 });
    }

    const result = await processarProcuracao(dadosBrutos);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Generate Doc API Error:", error);
    return NextResponse.json({ success: false, error: "Erro interno ao gerar documento." }, { status: 500 });
  }
}
