"use client";

/**
 * @fileOverview OmniReport - Gateway Híbrido Estabilizado para ambientes independentes.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, ShieldCheck, Database, Loader2, Save, Search, Cpu, Zap, AlertCircle } from "lucide-react";
import { executarVereditoAI } from "@/ai/veredito-ai-engine";
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
      const data = await executarVereditoAI(cnj, activeEngine as any);

      if (data && data.success) {
        if (data.mode === 'client_handoff' && activeEngine === 'grok') {
          try {
            const { puter } = await import('@heyputer/puter.js');
            const prompt = `Analise este processo judicial: ${JSON.stringify(data.rawProcess)}. 
            Gere JSON: {"resumo": "...", "risco": "...", "sugestao": "..."}.`;
            
            const response = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.3' });
            const content = response.message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

            setResult({
              ...data,
              parecer: {
                resumo: parsed.resumo || "Análise Grok concluída.",
                risco: parsed.risco || "Risco avaliado.",
                sugestao: parsed.sugestao || "Verificar prazos."
              }
            });
          } catch (puterError: any) {
            throw new Error("Erro no Motor Grok (Puter): " + puterError.message);
          }
        } else {
          setResult(data);
        }
        toast({ title: "Motor Ativado", description: `Processamento via ${activeEngine.toUpperCase()} concluído.` });
      } else {
        setError(data?.error || "Resposta inesperada do servidor.");
      }
    } catch (e: any) {
      setError(e.message || "Falha de conexão.");
      toast({ variant: "destructive", title: "Erro Crítico", description: "Falha no gateway de inteligência." });
    } finally {
      setIsSearching(false);
    }
  };

  const saveInsight = () => {
    if (!result) return;
    const saved = JSON.parse(localStorage.getItem('crm_insights') || '[]');
    const updated = [{ id: Date.now(), ...result, timestamp: Date.now() }, ...saved];
    localStorage.setItem('crm_insights', JSON.stringify(updated.slice(0, 20)));
    toast({ title: "Insight Arquivado" });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">OmniReport AI</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Gateway Independente Estabilizado V35</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-zinc-200 bg-white font-black flex items-center gap-2">
              {activeEngine === 'local' ? <Cpu className="h-3 w-3" /> : activeEngine === 'grok' ? <Zap className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
              MODO: {activeEngine.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-zinc-900 shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-zinc-900 text-white p-6">
                <CardTitle className="text-lg font-black uppercase tracking-tight">Veredito AI V35</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex gap-3">
                  <Input 
                    placeholder="CNJ (apenas números)..." 
                    className="h-14 font-mono border-2" 
                    value={cnj} 
                    onChange={e => setCnj(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleVereditoSearch()}
                  />
                  <Button className="h-14 px-8 bg-zinc-900 text-white font-black" onClick={handleVereditoSearch} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-black uppercase text-[10px]">Alerta do Gateway</AlertTitle>
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                )}

                {result && result.parecer && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="border-2 rounded-2xl overflow-hidden">
                      <div className="bg-zinc-50 border-b p-4 flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-zinc-500">Parecer Técnico Unificado</span>
                        <Button variant="ghost" size="icon" onClick={saveInsight}><Save className="h-4 w-4" /></Button>
                      </div>
                      <div className="p-8 space-y-8">
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Resumo</h4>
                          <p className="text-xs font-bold text-zinc-700 leading-relaxed pl-4 border-l-4">
                            {result.parecer.resumo}
                          </p>
                        </section>
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Risco</h4>
                          <p className="text-xs font-black text-zinc-900 bg-amber-50 p-4 rounded-xl">
                            {result.parecer.risco}
                          </p>
                        </section>
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Sugestão</h4>
                          <p className="text-xs font-bold text-zinc-800 pl-4 border-l-4">
                            {result.parecer.sugestao}
                          </p>
                        </section>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t">
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">Órgão</p>
                            <p className="text-[9px] font-black text-zinc-900">{result.metadata?.orgao || "---"}</p>
                          </div>
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">Tribunal</p>
                            <p className="text-[9px] font-black text-zinc-900">{result.metadata?.tribunal || "---"}</p>
                          </div>
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">Última Atualização</p>
                            <p className="text-[9px] font-black text-zinc-900">{result.metadata?.ultimaAtualizacao || "---"}</p>
                          </div>
                          <div className="bg-zinc-50 p-3 rounded-lg">
                            <p className="text-[8px] font-black text-zinc-400 uppercase">CNJ</p>
                            <p className="text-[9px] font-black text-zinc-900">{result.cnj}</p>
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
                  <span className="font-black uppercase text-xs">Modo Autônomo V35</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Este sistema opera de forma independente do Firebase. Todas as chaves e rotas de processamento estão embutidas no gateway de servidor.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
