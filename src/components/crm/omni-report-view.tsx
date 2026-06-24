
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Search, BrainCircuit, FileText, ShieldCheck, Database, 
  Terminal, Loader2, Save, History, 
  Lightbulb, Zap, Info, Clock, Building, Layers
} from "lucide-react";
import { executarVereditoAI, gerarRelatorioEstrategico } from "@/ai/veredito-ai-engine";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
    const savedInsights = localStorage.getItem('crm_insights');
    if (savedInsights) setInsights(JSON.parse(savedInsights));
  }, []);

  const handleVereditoSearch = async () => {
    const cleanCnj = cnj.trim();
    if (!cleanCnj) {
      toast({ variant: "destructive", title: "Erro", description: "Insira um CNJ válido." });
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const data = await executarVereditoAI(cleanCnj);
      
      if (data.success) {
        setResult(data);
        toast({ title: "Análise Cognitiva Concluída" });
      } else {
        toast({ variant: "destructive", title: "Busca DataJud", description: data.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no Motor AI" });
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
      toast({ title: "Relatório Gerado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na Geração" });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveInsight = () => {
    if (!result) return;
    const newInsight = {
      id: `insight_${Date.now()}`,
      cnj: result.cnj,
      parecer: result.parecer,
      metadata: result.metadata,
      timestamp: result.timestamp
    };
    const updated = [newInsight, ...insights];
    setInsights(updated);
    localStorage.setItem('crm_insights', JSON.stringify(updated));
    toast({ title: "Parecer Arquivado" });
  };

  const deleteInsight = (id: string) => {
    const updated = insights.filter(i => i.id !== id);
    setInsights(updated);
    localStorage.setItem('crm_insights', JSON.stringify(updated));
    toast({ title: "Registro Removido" });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter flex items-center gap-2">
              OmniReport <Badge className="bg-primary text-[9px]">v4.0 Elite</Badge>
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Painel Estratégico Analisador Inteligente</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-zinc-200 text-zinc-600 bg-white px-3 py-1 font-black flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> ENGINE: OPENROUTER
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <Card className="lg:col-span-2 border-2 border-zinc-900 shadow-xl bg-white overflow-hidden h-max">
            <CardHeader className="bg-zinc-900 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg"><BrainCircuit className="h-6 w-6 text-white" /></div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Veredito AI (Busca 360)</CardTitle>
                    <CardDescription className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Integração Direta DataJud + OpenAI</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input 
                    placeholder="Digite o CNJ..." 
                    className="h-14 pl-12 font-mono text-sm border-2 focus:border-zinc-900"
                    value={cnj}
                    onChange={(e) => setCnj(e.target.value)}
                  />
                </div>
                <Button 
                  className="h-14 px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest"
                  onClick={handleVereditoSearch}
                  disabled={isSearching}
                >
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "EXECUTAR"}
                </Button>
              </div>

              {result ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-zinc-50 border-b p-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <FileText className="h-4 w-4 text-primary" />
                         <span className="text-[11px] font-black uppercase text-zinc-900 tracking-tighter">Parecer Técnico Veredito AI</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[9px] font-black border-zinc-300 bg-white">CNJ: {result.cnj}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={saveInsight}>
                           <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-8">
                       <section className="space-y-3">
                         <div className="flex items-center gap-2">
                           <Info className="h-4 w-4 text-primary" />
                           <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Resumo Estruturado</h4>
                         </div>
                         <p className="text-xs font-bold text-zinc-700 leading-relaxed whitespace-pre-line border-l-4 border-zinc-100 pl-4">
                           {String(result.parecer.resumo)}
                         </p>
                       </section>

                       <section className="space-y-3">
                         <div className="flex items-center gap-2">
                           <Zap className="h-4 w-4 text-amber-500" />
                           <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Análise de Risco</h4>
                         </div>
                         <p className="text-xs font-black text-zinc-900 leading-relaxed whitespace-pre-line bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                           {String(result.parecer.risco)}
                         </p>
                       </section>

                       <section className="space-y-3">
                         <div className="flex items-center gap-2">
                           <Lightbulb className="h-4 w-4 text-primary" />
                           <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Sugestão Estratégica</h4>
                         </div>
                         <p className="text-xs font-bold text-zinc-800 leading-relaxed whitespace-pre-line border-l-4 border-primary/20 pl-4">
                           {String(result.parecer.sugestao)}
                         </p>
                       </section>

                       <div className="pt-8 border-t space-y-4">
                         <div className="flex items-center gap-2">
                           <Database className="h-4 w-4 text-zinc-400" />
                           <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Metadata DataJud</h4>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                           {[
                             { icon: Building, label: "Órgão Julgador", value: result.metadata.orgao },
                             { icon: FileText, label: "Classe", value: result.metadata.classe },
                             { icon: ShieldCheck, label: "Tribunal", value: result.metadata.tribunal },
                             { icon: Layers, label: "Grau", value: result.metadata.grau },
                             { icon: Clock, label: "Última Atualização", value: result.metadata.ultimaAtualizacao }
                           ].map((meta, i) => (
                             <div key={i} className="flex flex-col gap-1 p-3 bg-zinc-50 rounded-lg">
                               <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter flex items-center gap-1">
                                 <meta.icon className="h-2.5 w-2.5" /> {meta.label}
                               </span>
                               <span className="text-[10px] font-black text-zinc-900 uppercase truncate">
                                 {String(meta.value)}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-300 space-y-4">
                  <Terminal className="h-10 w-10 opacity-20" />
                  <div className="text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest">Aguardando Comando</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-2 shadow-lg hover:border-zinc-900 transition-all cursor-pointer group" onClick={() => setIsReportOpen(true)}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-900 group-hover:text-white transition-colors"><FileText className="h-5 w-5" /></div>
                  <h3 className="font-black uppercase text-xs">Relatório por Prompt</h3>
                </div>
                <Button variant="outline" className="w-full text-[10px] font-black h-9 border-zinc-200 uppercase">ACESSAR MOTOR</Button>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-lg hover:border-zinc-900 transition-all cursor-pointer group" onClick={() => setIsCloudOpen(true)}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-900 group-hover:text-white transition-colors"><Database className="h-5 w-5" /></div>
                  <h3 className="font-black uppercase text-xs">Armazém de Insights</h3>
                </div>
                <Button variant="outline" className="w-full text-[10px] font-black h-9 border-zinc-200 uppercase">EXPLORAR NUVEM</Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 text-white border-none shadow-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Auditoria Técnica</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase opacity-60">
                    <span>Insights Gravados</span>
                    <span>{insights.length}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase opacity-60">
                    <span>Certificação</span>
                    <span>W1 ELITE v4.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="max-w-7xl mx-auto py-8 border-t border-zinc-200 text-center">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            © Todos os direitos Reservados | W1 Capital | Davi Alves Figueredo
          </p>
        </footer>
      </div>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-3xl bg-white border-2">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-xl">Motor de Relatórios</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Textarea 
              placeholder="Descreva os parâmetros estratégicos..." 
              className="h-32 border-2 focus:border-zinc-900 text-sm font-bold"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />
            {reportResult && (
              <ScrollArea className="h-64 rounded-xl border-2 p-4 bg-zinc-50">
                <p className="text-xs font-bold text-zinc-700 whitespace-pre-line leading-relaxed">{reportResult}</p>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button 
              className="bg-zinc-900 text-white font-black text-xs h-12 flex-1" 
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? "PROCESSANDO..." : "GERAR RELATÓRIO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloudOpen} onOpenChange={setIsCloudOpen}>
        <DialogContent className="max-w-4xl bg-white border-2">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-xl">Armazém de Insights</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4 mt-4 scroll-black">
            <div className="space-y-6">
              {insights.length > 0 ? insights.map((insight: any) => (
                <div key={insight.id} className="p-6 rounded-2xl border-2 bg-zinc-50">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-zinc-900 text-[10px] font-black">{insight.cnj}</Badge>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(insight.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-black text-zinc-900 leading-tight">RESUMO: {String(insight.parecer?.resumo || "").substring(0, 150)}...</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase" onClick={() => { setCnj(insight.cnj); setResult(insight); setIsCloudOpen(false); }}>VER PARECER</Button>
                      <Button variant="ghost" size="sm" className="h-8 text-red-500 font-black text-[9px] uppercase" onClick={() => deleteInsight(insight.id)}>REMOVER</Button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-300">
                  <Database className="h-10 w-10 opacity-20 mb-2" />
                  <p className="text-[10px] font-black uppercase">Nenhum insight gravado.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
