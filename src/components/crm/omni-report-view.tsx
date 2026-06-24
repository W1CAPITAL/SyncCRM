
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Search, BrainCircuit, FileText, ShieldCheck, Database, 
  Terminal, Loader2, Sparkles, History, 
  Lock, Copyright, Lightbulb,
  Zap, Save, Trash2
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

  // Modais
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  
  // Relatório por Prompt
  const [reportText, setReportText] = useState("");
  const [reportResult, setReportResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Armazém Local (Substituindo Cloud Firestore)
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    const savedInsights = localStorage.getItem('crm_insights');
    if (savedInsights) setInsights(JSON.parse(savedInsights));
  }, []);

  const handleVereditoSearch = async () => {
    const cleanCnj = cnj.trim();
    if (!cleanCnj) {
      toast({ variant: "destructive", title: "Erro", description: "Insira um número de CNJ válido." });
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const data = await executarVereditoAI(cleanCnj);
      setResult(data);
      if (data.dados?.hits?.length > 0) {
        toast({ title: "Motor 360: Dados Capturados", description: "Análise cognitiva concluída." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no Motor AI", description: "Falha na comunicação segura." });
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
      toast({ title: "Relatório Gerado", description: "O motor Veredito sintetizou o documento." });
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
      cnj: cnj,
      sintese: result.sintese,
      dica: result.dica,
      timestamp: new Date().toISOString()
    };
    const updated = [newInsight, ...insights];
    setInsights(updated);
    localStorage.setItem('crm_insights', JSON.stringify(updated));
    toast({ title: "Insight Salvo", description: "Armazenado localmente no seu silo seguro." });
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
              OmniReport <Badge className="bg-primary text-[9px]">v3.5 Independent</Badge>
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Painel Estratégico Analisador Independente</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-green-200 text-green-600 bg-green-50 px-3 py-1 font-black flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> CONFORMIDADE LOCAL ATIVA
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
                    <CardDescription className="text-zinc-400 text-[10px] font-bold uppercase">Motor de Inteligência Local + Gemini</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input 
                    placeholder="Digite o CNJ para Busca Profunda..." 
                    className="h-14 pl-12 font-mono text-sm border-2 focus:border-zinc-900"
                    value={cnj}
                    onChange={(e) => setCnj(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVereditoSearch()}
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
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-5 rounded-2xl border-2 border-zinc-100 bg-zinc-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                       <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-900" onClick={saveInsight}>
                         <Save className="h-4 w-4" />
                       </Button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-black uppercase text-zinc-900">SÍNTESE DA INTELIGÊNCIA</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-700 leading-relaxed whitespace-pre-line">{result.sintese}</p>
                    
                    {result.resolucao && (
                      <div className="mt-4 pt-4 border-t border-zinc-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-[10px] font-black uppercase text-zinc-500">RESOLUÇÃO SUGERIDA</span>
                        </div>
                        <p className="text-xs text-zinc-600 font-bold">{result.resolucao}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border-2 rounded-xl bg-white space-y-2 border-zinc-100">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <span className="text-[9px] font-black text-zinc-400 uppercase">DICA ESTRATÉGICA</span>
                      </div>
                      <p className="font-bold text-zinc-900 uppercase text-[10px]">{result.dica}</p>
                    </div>
                    <div className="p-4 border-2 rounded-xl bg-zinc-900 text-white space-y-2">
                      <span className="text-[9px] font-black text-zinc-400 uppercase opacity-60">Status de Rede</span>
                      <p className="font-bold text-green-400 uppercase text-[10px] flex items-center gap-2">
                         <ShieldCheck className="h-3 w-3" /> Conexão Segura Ativa
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-300 space-y-2">
                  <Terminal className="h-8 w-8 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aguardando Comando de Busca Profunda...</p>
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
                <p className="text-[10px] text-zinc-500 font-bold uppercase leading-tight">Gere documentos estratégicos via comando de texto.</p>
                <Button variant="outline" className="w-full text-[10px] font-black h-9 border-zinc-200 uppercase">ACESSAR MOTOR</Button>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-lg hover:border-zinc-900 transition-all cursor-pointer group" onClick={() => setIsCloudOpen(true)}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-900 group-hover:text-white transition-colors"><Database className="h-5 w-5" /></div>
                  <h3 className="font-black uppercase text-xs">Armazém Cloud</h3>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase leading-tight">Repositório de insights salvos localmente.</p>
                <Button variant="outline" className="w-full text-[10px] font-black h-9 border-zinc-200 uppercase">EXPLORAR NUVEM</Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 text-white border-none shadow-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Auditoria Local</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase opacity-60">
                    <span>Insights Salvos</span>
                    <span>{insights.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="max-w-7xl mx-auto py-12 border-t border-zinc-200 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <Copyright className="h-3 w-3 text-zinc-300" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                © Todos os direitos Reservados | W1 Capital
              </p>
            </div>
            <p className="text-[12px] font-black text-zinc-900 uppercase tracking-tight">
              Davi Alves Figueredo
            </p>
          </div>
        </footer>
      </div>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-3xl bg-white border-2">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-xl">Arquiteto de Relatórios</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase text-zinc-400">Motor de Geração Veredito 360</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="text-[10px] font-black uppercase">O que você deseja analisar?</Label>
            <Textarea 
              placeholder="Ex: Gere um relatório estratégico para um processo de cobrança indevida contra banco..." 
              className="h-32 border-2 focus:border-zinc-900 text-sm font-bold"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />
            {reportResult && (
              <ScrollArea className="h-64 rounded-xl border-2 p-4 bg-zinc-50">
                <p className="text-xs font-medium text-zinc-700 whitespace-pre-line leading-relaxed">{reportResult}</p>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="font-black text-xs h-12 flex-1" onClick={() => { setReportResult(""); setReportText(""); }}>LIMPAR</Button>
            <Button 
              className="bg-zinc-900 text-white font-black text-xs h-12 flex-1" 
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : "GERAR RELATÓRIO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloudOpen} onOpenChange={setIsCloudOpen}>
        <DialogContent className="max-w-3xl bg-white border-2">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-xl">Armazém de Insights</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase text-zinc-400">Repositório de Análises Locais</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4 mt-4">
            <div className="space-y-4">
              {insights.length > 0 ? insights.map((insight: any) => (
                <div key={insight.id} className="p-4 rounded-xl border-2 bg-zinc-50 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className="bg-zinc-900 text-[9px] font-black">{insight.cnj}</Badge>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(insight.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-bold text-zinc-900 mb-2 truncate">{insight.sintese}</p>
                  <p className="text-[10px] text-zinc-500 italic leading-tight">{insight.dica}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute bottom-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteInsight(insight.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-300">
                  <Database className="h-10 w-10 opacity-20 mb-2" />
                  <p className="text-[10px] font-black uppercase">Nenhum insight no armazém local.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
