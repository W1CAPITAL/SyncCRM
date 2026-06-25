"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Loader2, Search, Cpu, Zap, AlertCircle, Copy, Check, MessageSquare, CalendarClock, TrendingUp, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Limpa artefatos de markdown no lado do cliente e preserva parágrafos.
 */
function cleanClientString(str: string): string {
  if (!str) return "";
  return str.replace(/\*\*/g, '')
            .replace(/###/g, '')
            .replace(/##/g, '')
            .replace(/#/g, '')
            .replace(/---/g, '')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/[`_]/g, '')
            .trim();
}

/**
 * OmniReport AI V50 Elite - Gateway Híbrido purificado de Markdown.
 */
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha na comunicação com o servidor.");
      }

      const data = await response.json();

      if (data.success) {
        if (data.mode === 'client_handoff' && activeEngine === 'grok') {
          try {
            const { puter } = await import('@heyputer/puter.js');
            
            const prompt = `AJA COMO: Diretor de Legal Ops de Elite. 
            Analise: ${JSON.stringify(data.rawProcess)}. 
            PROIBIDO USAR MARKDOWN (**, ##, listas numeradas). Responda APENAS em JSON PURO:
            {
              "termometro": "Cenário em uma frase.", 
              "traducao": "Decisão em parágrafo comum.", 
              "alertas": "Riscos em parágrafo comum. Se nada, 'Sem alertas'.", 
              "plano_acao": "Ação de HOJE em parágrafo comum.", 
              "whatsapp": "Mensagem Cliente V50 (Eduardo Banco Pan style). SEM JURIDIQUÊS.", 
              "followup": "Data e motivo estratégico."
            }`;
            
            const responsePuter = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.3' });
            const content = responsePuter.message.content;
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
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
          } catch (puterError: any) {
            setError("Erro no Motor Grok: " + puterError.message);
          }
        } else {
          setResult({
            ...data,
            parecer: {
              termometro: cleanClientString(data.parecer.termometro),
              traducao: cleanClientString(data.parecer.traducao),
              alertas: cleanClientString(data.parecer.alertas),
              plano_acao: cleanClientString(data.parecer.plano_acao),
              whatsapp: cleanClientString(data.parecer.whatsapp),
              followup: cleanClientString(data.parecer.followup)
            }
          });
        }
        
        if (!error) {
          toast({ title: "Análise V50 Concluída", description: "Estratégia e Mensagem Cliente geradas." });
        }
      } else {
        setError(data.error || "Erro desconhecido.");
      }
    } catch (e: any) {
      setError(e.message || "Erro de conexão.");
      toast({ variant: "destructive", title: "Falha de Conexão" });
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado!", description: "Mensagem pronta para o WhatsApp." });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">OmniReport AI</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Legal Ops & Atendimento de Elite V50</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white font-black flex items-center gap-2">
              {activeEngine === 'local' ? <Cpu className="h-3 w-3" /> : activeEngine === 'grok' ? <Zap className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
              ENGINE: {activeEngine.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-zinc-900 shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-zinc-900 text-white p-6">
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Veredito AI Elite V50
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex gap-3">
                  <Input 
                    placeholder="CNJ para análise de elite (V50)..." 
                    className="h-14 font-mono border-2 text-md" 
                    value={cnj} 
                    onChange={e => setCnj(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleVereditoSearch()}
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
                    <div className="border-2 border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-zinc-50 border-b p-4 flex items-center gap-2">
                        <Badge className="bg-zinc-900 text-white font-black text-[9px] uppercase tracking-widest">
                          🎯 1. VISÃO ESTRATÉGICA (OPERACIONAL)
                        </Badge>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400">Termômetro do Processo</h4>
                          <p className="text-sm font-black text-zinc-900 border-l-4 border-primary pl-4 uppercase whitespace-pre-wrap">
                            {result.parecer.termometro}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400">Tradução do Evento</h4>
                          <p className="text-xs font-medium text-zinc-700 leading-relaxed whitespace-pre-wrap">
                            {result.parecer.traducao}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase text-red-500">Alertas Críticos</h4>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                              <p className="text-[11px] font-bold text-red-900 leading-tight whitespace-pre-wrap">
                                {result.parecer.alertas}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase text-zinc-900">Plano de Ação (HOJE)</h4>
                            <div className="bg-zinc-900 p-4 rounded-xl">
                              <p className="text-[11px] font-black text-white leading-tight whitespace-pre-wrap">
                                {result.parecer.plano_acao}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 border-green-200 rounded-2xl overflow-hidden bg-white shadow-lg shadow-green-100">
                      <div className="bg-green-50 border-b border-green-200 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-white font-black text-[9px] uppercase tracking-widest">
                            📱 2. MENSAGEM WHATSAPP
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-2 text-green-700 hover:text-green-900 hover:bg-green-100 font-black text-[10px]"
                          onClick={() => copyToClipboard(result.parecer.whatsapp)}
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? 'COPIADO' : 'COPIAR MENSAGEM'}
                        </Button>
                      </div>
                      <div className="p-8 bg-white relative">
                         <div className="absolute top-4 right-4 opacity-5">
                            <MessageSquare className="h-20 w-20 text-green-600" />
                         </div>
                         <p className="text-sm font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap">
                           {result.parecer.whatsapp}
                         </p>
                      </div>
                    </div>

                    <div className="bg-zinc-900 rounded-2xl p-6 flex items-center justify-between text-white shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <CalendarClock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-zinc-400">📅 3. GATILHO DE RETORNO</p>
                          <p className="text-xs font-bold uppercase tracking-widest">Próximo Follow-up Sugerido</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-primary text-white font-black px-4 py-2 text-md">
                          {result.parecer.followup}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 shadow-lg bg-zinc-900 text-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                  <div className="p-2 bg-primary rounded-lg text-white"><TrendingUp className="h-5 w-5" /></div>
                  <span className="font-black uppercase text-xs tracking-widest">Estratégia V50 Elite</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold leading-relaxed uppercase">
                  Script unificado para antecipação de crise e acolhimento imediato do cliente jurídico jurídico.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
