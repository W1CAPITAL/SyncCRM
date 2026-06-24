"use client";

/**
 * @fileOverview OmniReport - Versão Arquitetura Limpa.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BrainCircuit, FileText, ShieldCheck, Database, Terminal, Loader2, Save, History, Lightbulb, Zap, Info, Clock, Building, Layers } from "lucide-react";
import { executarVereditoAI, gerarRelatorioEstrategico } from "@/ai/veredito-ai-engine";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export function OmniReportView() {
  const { toast } = useToast();
  const [cnj, setCnj] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportResult, setReportResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('crm_insights');
    if (saved) setInsights(JSON.parse(saved));
  }, []);

  const handleVereditoSearch = async () => {
    if (!cnj.trim()) return;
    setIsSearching(true);
    setResult(null);
    try {
      const data = await executarVereditoAI(cnj);
      if (data.success) {
        setResult(data);
        toast({ title: "Análise Concluída" });
      } else {
        toast({ variant: "destructive", title: "Busca DataJud", description: data.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportText.trim()) return;
    setIsGenerating(true);
    try {
      const res = await gerarRelatorioEstrategico(reportText);
      setReportResult(res);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveInsight = () => {
    if (!result) return;
    const newInsight = { id: Date.now(), ...result, timestamp: Date.now() };
    const updated = [newInsight, ...insights];
    setInsights(updated);
    localStorage.setItem('crm_insights', JSON.stringify(updated));
    toast({ title: "Parecer Arquivado" });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter flex items-center gap-2">OmniReport AI</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Motor Estratégico Independente</p>
          </div>
          <Badge variant="outline" className="border-zinc-200 bg-white font-black"><ShieldCheck className="h-3 w-3 mr-2" /> GATEWAY: OPENROUTER</Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-2 border-zinc-900 shadow-xl bg-white overflow-hidden h-max">
            <CardHeader className="bg-zinc-900 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg"><BrainCircuit className="h-6 w-6 text-white" /></div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Veredito AI</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex gap-3">
                <Input placeholder="CNJ do Processo..." className="h-14 font-mono border-2" value={cnj} onChange={e => setCnj(e.target.value)} />
                <Button className="h-14 px-8 bg-zinc-900 text-white font-black" onClick={handleVereditoSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "EXECUTAR"}
                </Button>
              </div>

              {result && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="border-2 rounded-2xl overflow-hidden">
                    <div className="bg-zinc-50 border-b p-4 flex justify-between items-center">
                      <span className="text-[11px] font-black uppercase">Parecer Técnico Veredito AI</span>
                      <Button variant="ghost" size="icon" onClick={saveInsight}><Save className="h-4 w-4" /></Button>
                    </div>
                    <div className="p-8 space-y-8">
                       <section className="space-y-3">
                         <h4 className="text-[10px] font-black uppercase text-zinc-400">Resumo Estruturado</h4>
                         <p className="text-xs font-bold text-zinc-700 leading-relaxed whitespace-pre-line border-l-4 border-zinc-100 pl-4">
                           {String(result?.parecer?.resumo || "Não disponível.")}
                         </p>
                       </section>
                       <section className="space-y-3">
                         <h4 className="text-[10px] font-black uppercase text-zinc-400">Análise de Risco</h4>
                         <p className="text-xs font-black text-zinc-900 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                           {String(result?.parecer?.risco || "Não disponível.")}
                         </p>
                       </section>
                       <section className="space-y-3">
                         <h4 className="text-[10px] font-black uppercase text-zinc-400">Sugestão Estratégica</h4>
                         <p className="text-xs font-bold text-zinc-800 whitespace-pre-line border-l-4 border-primary/20 pl-4">
                           {String(result?.parecer?.sugestao || "Não disponível.")}
                         </p>
                       </section>

                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t">
                          {[
                            { label: "Órgão", val: result?.metadata?.orgao },
                            { label: "Classe", val: result?.metadata?.classe },
                            { label: "Tribunal", val: result?.metadata?.tribunal },
                            { label: "Última Atualização", val: result?.metadata?.ultimaAtualizacao }
                          ].map((m, i) => (
                            <div key={i} className="bg-zinc-50 p-3 rounded-lg">
                              <p className="text-[8px] font-black text-zinc-400 uppercase">{m.label}</p>
                              <p className="text-[10px] font-black text-zinc-900 truncate">{String(m.val || "---")}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
             <Card className="border-2 shadow-lg hover:border-zinc-900 transition-all cursor-pointer" onClick={() => setIsReportOpen(true)}>
               <CardContent className="p-6 flex items-center gap-3">
                 <FileText className="h-5 w-5" />
                 <span className="font-black uppercase text-xs">Relatório por Prompt</span>
               </CardContent>
             </Card>
             <Card className="border-2 shadow-lg hover:border-zinc-900 transition-all cursor-pointer" onClick={() => setIsCloudOpen(true)}>
               <CardContent className="p-6 flex items-center gap-3">
                 <Database className="h-5 w-5" />
                 <span className="font-black uppercase text-xs">Armazém de Insights</span>
               </CardContent>
             </Card>
          </div>
        </div>
      </div>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-3xl bg-white border-2">
          <DialogHeader><DialogTitle className="font-black uppercase">Motor de Relatórios</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <Textarea placeholder="Parâmetros estratégicos..." className="h-32 border-2" value={reportText} onChange={e => setReportText(e.target.value)} />
            {reportResult && <ScrollArea className="h-64 rounded-xl border-2 p-4 bg-zinc-50 text-xs font-bold whitespace-pre-line">{reportResult}</ScrollArea>}
          </div>
          <DialogFooter>
            <Button className="bg-zinc-900 text-white font-black w-full h-12" onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? "PROCESSANDO..." : "GERAR RELATÓRIO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
