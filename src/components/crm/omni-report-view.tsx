"use client";

/**
 * @fileOverview OmniReport AI V41 - Gateway Híbrido via API Route.
 * Removida a importação direta de Server Actions para evitar erros de compilação e 403.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, ShieldCheck, Loader2, Save, Search, Cpu, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OmniReportView() {
  const { toast } = useToast();
  const [cnj, setCnj] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeEngine, setActiveEngine] = useState<string>("openrouter");
  const [error, setError] = useState<string | null>(null);

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
      // Chamada via API Route pura para evitar 405 em hosts estáticos
      const response = await fetch('/api/veredito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnj, engine: activeEngine })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na comunicação com o servidor.");
      }

      const data = await response.json();

      if (data.success) {
        if (data.mode === 'client_handoff' && activeEngine === 'grok') {
          try {
            // Importação dinâmica para evitar carregar Puter no bundle inicial
            const { puter } = await import('@heyputer/puter.js');
            
            const prompt = `Analise este processo judicial e forneça um parecer técnico estruturado:
            DADOS: ${JSON.stringify(data.rawProcess)}
            Responda APENAS em JSON: {"resumo": "...", "risco": "...", "sugestao": "..."}`;
            
            const responsePuter = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.3' });
            const content = responsePuter.message.content;
            
            // Limpeza de Markdown JSON se necessário
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            setResult({
              ...data,
              parecer: {
                resumo: parsed.resumo || "Análise finalizada pelo Grok.",
                risco: parsed.risco || "Risco verificado via Puter.js.",
                sugestao: parsed.sugestao || "Consultar movimentações no tribunal."
              }
            });
          } catch (puterError: any) {
            setError("Falha no Motor Grok (Puter): " + puterError.message);
          }
        } else {
          setResult(data);
        }
        
        if (!error) {
          toast({ title: "Consulta Finalizada", description: `Processado via ${activeEngine.toUpperCase()}.` });
        }
      } else {
        setError(data.error || "Ocorreu um erro desconhecido.");
      }
    } catch (e: any) {
      console.error("Erro no Gateway OmniReport:", e);
      setError(e.message || "Falha crítica de rede.");
      toast({ variant: "destructive", title: "Erro de Comunicação" });
    } finally {
      setIsSearching(false);
    }
  };

  const saveInsight = () => {
    if (!result) return;
    const saved = JSON.parse(localStorage.getItem('crm_insights') || '[]');
    const updated = [{ id: Date.now(), ...result, timestamp: Date.now() }, ...saved];
    localStorage.setItem('crm_insights', JSON.stringify(updated.slice(0, 20)));
    toast({ title: "Análise Salva", description: "Histórico local atualizado." });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">OmniReport AI</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Inteligência Híbrida V41 Independente</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white font-black flex items-center gap-2">
              {activeEngine === 'local' ? <Cpu className="h-3 w-3" /> : activeEngine === 'grok' ? <Zap className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
              MODO: {activeEngine.toUpperCase()}
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
                  <BrainCircuit className="h-5 w-5" />
                  Veredito AI - Análise Consolidada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex gap-3">
                  <Input 
                    placeholder="CNJ (ex: 0800...)" 
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
                    <AlertTitle className="font-black uppercase text-[10px]">Falha no Gateway</AlertTitle>
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                )}

                {result && result.parecer && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="border-2 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-zinc-50 border-b p-4 flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-zinc-500">Parecer Técnico V41</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveInsight}><Save className="h-4 w-4" /></Button>
                      </div>
                      <div className="p-8 space-y-8 bg-white text-zinc-900">
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                            <div className="h-1 w-4 bg-zinc-300 rounded-full" /> Resumo
                          </h4>
                          <p className="text-xs font-bold text-zinc-700 leading-relaxed pl-4 border-l-4 border-zinc-200">
                            {result.parecer.resumo}
                          </p>
                        </section>
                        
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                            <div className="h-1 w-4 bg-amber-400 rounded-full" /> Risco
                          </h4>
                          <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                            <p className="text-xs font-black text-amber-900">
                              {result.parecer.risco}
                            </p>
                          </div>
                        </section>
                        
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                            <div className="h-1 w-4 bg-zinc-900 rounded-full" /> Sugestão
                          </h4>
                          <p className="text-xs font-bold text-zinc-800 pl-4 border-l-4 border-zinc-900">
                            {result.parecer.sugestao}
                          </p>
                        </section>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t border-zinc-100">
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">Órgão</p>
                            <p className="text-[9px] font-black text-zinc-900 truncate">{result.metadata?.orgao}</p>
                          </div>
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">Tribunal</p>
                            <p className="text-[9px] font-black text-zinc-900 truncate">{result.metadata?.tribunal}</p>
                          </div>
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">Status</p>
                            <p className="text-[9px] font-black text-zinc-900 truncate">{result.metadata?.ultimaAtualizacao}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 shadow-lg bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-zinc-900" />
                  <span className="font-black uppercase text-xs">Sistema Purificado</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase">
                  Todas as dependências do Firebase foram removidas. O sistema agora opera via API Routes nativas para garantir 100% de compatibilidade fora do Studio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
