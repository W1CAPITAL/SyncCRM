"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BrainCircuit, Loader2, Search, Cpu, Zap, AlertCircle, Copy, 
  Check, MessageSquare, CalendarClock, Target,
  ChevronRight, History, ShieldAlert, FileText, Landmark, Clock, FileWarning
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

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
        setResult(data);
        toast({ title: "Relatório Consolidado", description: "Análise estratégica V28 Elite finalizada." });
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError("Falha crítica de comunicação com o motor estratégico neural.");
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado para Área de Transferência", description: "Mensagem pronta para envio via WhatsApp." });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      <header className="bg-white border-b px-10 py-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">OmniReport AI</h2>
          <p className="text-sm font-medium text-slate-500">Inteligência de Legal Ops & Decisão Cirúrgica V28.4</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 px-4 py-2 font-bold flex items-center gap-2 shadow-sm rounded-xl">
            {activeEngine === 'local' ? <Cpu className="h-3 w-3" /> : activeEngine === 'grok' ? <Zap className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
            {activeEngine.toUpperCase()} ENGINE
          </Badge>
          <Badge className="bg-primary text-white px-4 py-2 font-black rounded-xl shadow-lg shadow-primary/20">V28 ELITE</Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 scroll-black">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-10 space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3.5 bg-primary/10 rounded-2xl text-primary shadow-inner"><Target className="h-6 w-6" /></div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Entrada de Dados do Processo</h3>
                <p className="text-xs text-slate-500 font-medium">Insira o CNJ para extração e análise estrutural.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1 group">
                <Input 
                  placeholder="Número do Processo (CNJ)..." 
                  className="h-16 font-mono pl-14 text-lg border-slate-200 focus:ring-primary/20 rounded-2xl transition-all group-hover:border-primary/40" 
                  value={cnj} 
                  onChange={e => setCnj(e.target.value)} 
                  disabled={isSearching}
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
              <Button className="h-16 px-10 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]" onClick={handleVereditoSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : null}
                {isSearching ? "ANALISANDO..." : "GERAR RELATÓRIO ESTRATÉGICO"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-100 bg-red-50 text-red-900 rounded-2xl p-6">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle className="font-bold uppercase text-[10px] tracking-widest mb-1">Erro de Processamento V28</AlertTitle>
                <AlertDescription className="text-sm font-medium opacity-90">{error}</AlertDescription>
              </Alert>
            )}
          </section>

          {result && result.parecer && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              
              <div className="lg:col-span-8 space-y-10">
                <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <CardTitle className="text-[10px] font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em]">
                      <FileText className="h-4 w-4" /> Diagnóstico Estratégico Executivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 space-y-10">
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">1. Termômetro Operacional</p>
                      <div className="p-6 bg-slate-50 rounded-3xl border-l-[6px] border-l-primary shadow-inner">
                        <p className="text-xl font-bold text-slate-900 leading-tight">
                          {result.parecer.termometro}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">2. Tradução Técnica (Para o Cliente)</p>
                      <p className="text-base text-slate-700 leading-relaxed font-medium bg-slate-50/30 p-6 rounded-3xl border border-slate-100">
                        {result.parecer.traducao}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest px-2 flex items-center gap-2">
                          <FileWarning className="h-3 w-3" /> Alertas de Risco Imediato
                        </p>
                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 min-h-[120px] shadow-sm shadow-red-600/5">
                          <p className="text-sm font-bold text-red-900 leading-relaxed">
                            {result.parecer.alertas}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-2 flex items-center gap-2">
                          <Target className="h-3 w-3" /> Estratégia Recomendada (HOJE)
                        </p>
                        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20 min-h-[120px] border border-slate-800">
                          <p className="text-sm font-bold text-white leading-relaxed">
                            {result.parecer.plano_acao}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <CardTitle className="text-[10px] font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em]">
                      <History className="h-4 w-4" /> Histórico Digital Integral (DataJud V51)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10">
                    <div className="space-y-10 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100 before:rounded-full">
                      {result.historico?.map((item: any, idx: number) => (
                        <div key={idx} className="relative flex gap-10 group">
                          <div className={cn(
                            "absolute left-3.5 -translate-x-1/2 h-5 w-5 rounded-full border-4 border-white transition-all shadow-md z-10",
                            idx === 0 ? "bg-primary scale-125 ring-4 ring-primary/20" : "bg-slate-200 group-hover:bg-slate-400"
                          )}></div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{item.data}</span>
                              {idx === 0 && <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-bold px-2 py-0.5 h-auto rounded-full">MAIS RECENTE</Badge>}
                            </div>
                            <p className="text-sm font-bold text-slate-800 leading-tight uppercase group-hover:text-primary transition-colors">
                              {item.evento}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <Card className="rounded-[2rem] border-green-200 shadow-lg shadow-green-600/5 overflow-hidden bg-green-50/10">
                  <CardHeader className="bg-green-50/80 border-b border-green-100 p-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-green-700 flex items-center gap-3 uppercase tracking-widest">
                      <MessageSquare className="h-4 w-4" /> Resumo WhatsApp
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-green-600 hover:bg-green-100 rounded-xl" onClick={() => copyToClipboard(result.parecer.whatsapp)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="bg-white/60 p-6 rounded-3xl border border-green-100 shadow-inner">
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed italic">
                        "{result.parecer.whatsapp}"
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none bg-slate-900 text-white shadow-2xl overflow-hidden relative group">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl"></div>
                  <CardContent className="p-10 space-y-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/10 rounded-2xl shadow-lg border border-white/5"><CalendarClock className="h-7 w-7 text-blue-400" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Próxima Revisão</p>
                        <p className="text-xl font-bold tracking-tight">Gatilho Follow-up</p>
                      </div>
                    </div>
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center shadow-inner group-hover:bg-white/10 transition-all">
                      <span className="text-4xl font-black text-white tracking-tighter">{result.parecer.followup}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 font-bold text-[9px] tracking-widest uppercase">
                      <div className="h-px flex-1 bg-slate-800"></div>
                      V28 STRATEGIC SHIELD
                      <div className="h-px flex-1 bg-slate-800"></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                    <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Landmark className="h-4 w-4" /> Dados do Juízo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comarca / Tribunal</span>
                      <p className="text-xs font-bold text-slate-900 uppercase">12ª Vara Cível - Foro Central SP</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Classe Processual</span>
                      <p className="text-xs font-bold text-slate-900 uppercase">Procedimento Comum Cível</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}