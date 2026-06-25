
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BrainCircuit, Loader2, Search, Cpu, Zap, AlertCircle, Copy, 
  Check, MessageSquare, CalendarClock, Target,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Blindagem absoluta contra erro 'replace is not a function'.
 * Força conversão para string antes de manipular.
 */
function cleanClientString(str: any): string {
  const val = String(str || "");
  if (!val || val === "undefined" || val === "null") return "";
  return val.replace(/\*\*/g, '')
            .replace(/###/g, '')
            .replace(/##/g, '')
            .replace(/#/g, '')
            .replace(/---/g, '')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/[`_]/g, '')
            .trim();
}

export function OmniReportView() {
  const { toast } = useToast();
  const [cnj, setCnj] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeEngine, setActiveEngine] = useState<string>("openrouter");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const engine = localStorage.getItem('crm_ai_engine') || "openrouter";
    setActiveEngine(engine);
  }, []);

  const handleVereditoSearch = async () => {
    if (!cnj.trim()) return;
    setIsSearching(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/veredito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnj, engine: activeEngine })
      });

      const data = await response.json();

      if (data.success) {
        if (data.mode === 'client_handoff' && activeEngine === 'grok') {
          const { puter } = await import('@heyputer/puter.js');
          
          const prompt = `AJA COMO: Diretor de Legal Ops de Elite (V51). 
          Analise o CNJ: ${cnj}. 
          HISTÓRICO INTEGRAL DATAJUD: ${JSON.stringify(data.historico)}.
          
          DECISÃO ESTRATÉGICA: Baseie-se no histórico integral para dar uma ordem de ação cirúrgica. 
          PROIBIDO RESPOSTAS GENÉRICAS. PROIBIDO MARKDOWN. Responda APENAS em JSON PURO:
          {
            "termometro": "Cenário real crítico ou favorável.", 
            "traducao": "O que realmente aconteceu no último evento de forma técnica.", 
            "alertas": "Riscos reais detectados no histórico de movimentações.", 
            "plano_acao": "DECISÃO PARA HOJE (ORDEM DIRETA E NÃO GENÉRICA).", 
            "whatsapp": "Mensagem executiva para o cliente.", 
            "followup": "Próxima data estratégica baseada no tempo do tribunal."
          }`;
          
          const responsePuter = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.3' });
          const content = responsePuter.message.content;
          const cleanJson = String(content).replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          setResult({
            ...data,
            parecer: {
              termometro: cleanClientString(parsed.termometro),
              traducao: cleanClientString(parsed.traducao),
              alertas: cleanClientString(parsed.alertas),
              plano_acao: cleanClientString(parsed.plano_acao),
              whatsapp: cleanClientString(parsed.whatsapp),
              followup: cleanClientString(parsed.followup)
            }
          });
        } else {
          setResult(data);
        }
        toast({ title: "Análise V51 Concluída", description: "Histórico integral processado." });
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError("Falha de conexão com o motor AI.");
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado!", description: "Mensagem pronta." });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">OmniReport AI</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Legal Ops & Decisão Cirúrgica V51 Elite</p>
          </div>
          <Badge variant="outline" className="border-zinc-200 bg-white font-black flex items-center gap-2">
            {activeEngine === 'local' ? <Cpu className="h-3 w-3" /> : activeEngine === 'grok' ? <Zap className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
            ENGINE: {activeEngine.toUpperCase()}
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-black">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-2 border-zinc-900 shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white p-6">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Target className="h-5 w-5" />
                Veredito AI V51 (High Fidelity)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex gap-3">
                <Input 
                  placeholder="CNJ para análise de alta fidelidade..." 
                  className="h-14 font-mono border-2 text-md" 
                  value={cnj} 
                  onChange={e => setCnj(e.target.value)} 
                  disabled={isSearching}
                />
                <Button className="h-14 px-8 bg-zinc-900 text-white hover:bg-zinc-800 font-black" onClick={handleVereditoSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-6 w-6" />}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="border-2 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-black uppercase text-[10px]">Falha na Análise</AlertTitle>
                  <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                </Alert>
              )}

              {result && result.parecer && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* 1. VISÃO ESTRATÉGICA */}
                  <div className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-zinc-50 border-b p-4 flex items-center gap-2">
                      <Badge className="bg-zinc-900 text-white font-black text-[9px] uppercase tracking-widest">
                        🎯 1. VISÃO ESTRATÉGICA (OPERACIONAL)
                      </Badge>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase text-zinc-400">Termômetro</h4>
                        <p className="text-sm font-black text-zinc-900 border-l-4 border-primary pl-4 uppercase">
                          {result.parecer.termometro}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase text-zinc-400">Tradução do Evento</h4>
                        <p className="text-xs font-medium text-zinc-700 leading-relaxed">
                          {result.parecer.traducao}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black uppercase text-red-500">Alertas Críticos</h4>
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <p className="text-[11px] font-bold text-red-900 leading-tight">
                              {result.parecer.alertas}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black uppercase text-zinc-900">Decisão Sugerida (HOJE)</h4>
                          <div className="bg-zinc-900 p-4 rounded-xl shadow-lg">
                            <p className="text-[11px] font-black text-white leading-tight uppercase">
                              {result.parecer.plano_acao}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. MENSAGEM WHATSAPP */}
                  <div className="border-2 border-green-200 rounded-2xl overflow-hidden bg-white">
                    <div className="bg-green-50 border-b border-green-200 p-4 flex justify-between items-center">
                      <Badge className="bg-green-600 text-white font-black text-[9px] uppercase tracking-widest">
                        📱 2. MENSAGEM WHATSAPP
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-green-700 font-black text-[10px]" onClick={() => copyToClipboard(result.parecer.whatsapp)}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'COPIADO' : 'COPIAR'}
                      </Button>
                    </div>
                    <div className="p-6 bg-white">
                       <p className="text-sm font-bold text-zinc-700 leading-relaxed">
                         {result.parecer.whatsapp}
                       </p>
                    </div>
                  </div>

                  {/* 3. GATILHO DE RETORNO */}
                  <div className="bg-zinc-900 rounded-2xl p-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <CalendarClock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-zinc-400">📅 3. GATILHO DE RETORNO</p>
                        <p className="text-xs font-bold uppercase tracking-widest">Follow-up Estratégico</p>
                      </div>
                    </div>
                    <Badge className="bg-primary text-white font-black px-4 py-2 text-md">
                      {result.parecer.followup}
                    </Badge>
                  </div>

                  {/* 4. HISTÓRICO INTEGRAL (DATAJUD) */}
                  <div className="border-2 border-zinc-100 rounded-2xl overflow-hidden bg-white shadow-inner">
                    <div className="bg-zinc-50 border-b p-4 flex items-center gap-2">
                      <Badge variant="outline" className="border-zinc-300 text-zinc-500 font-black text-[9px] uppercase tracking-widest">
                        🏛️ 4. HISTÓRICO INTEGRAL (DATAJUD V51)
                      </Badge>
                    </div>
                    <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto scroll-black">
                      {result.historico?.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 items-start border-b border-zinc-50 pb-4 last:border-0 group">
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-3 rounded-full bg-zinc-200 mt-1 group-hover:bg-primary transition-colors"></div>
                            {idx !== result.historico.length - 1 && <div className="w-[1px] h-full bg-zinc-100 min-h-[40px]"></div>}
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-zinc-400 uppercase">{item.data}</p>
                            <p className="text-xs font-bold text-zinc-700 uppercase leading-tight">{item.evento}</p>
                          </div>
                          <ChevronRight className="h-3 w-3 text-zinc-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
