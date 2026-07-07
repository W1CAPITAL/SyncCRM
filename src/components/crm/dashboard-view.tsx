"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Target, Download, ShieldAlert, Layers, Clock, ArrowRight, BrainCircuit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UnifiedMetrics } from "@/lib/metrics-engine";

interface DashboardProps {
  metrics: UnifiedMetrics;
}

export function DashboardView({ metrics }: DashboardProps) {
  if (!metrics) return null;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-black">
      <header className="bg-white border-b px-10 py-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Visão Executiva</h2>
          <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mt-2">Painel de Gabinete | Lexis Predict</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="h-10 border-zinc-200 bg-zinc-50 px-5 rounded-xl font-black text-[10px] text-black uppercase shadow-sm">
            {metrics.closedWithAppointment?.length || 0} ARQUIVADOS COM AGENDA
          </Badge>
          <Button variant="outline" className="h-12 border-2 border-zinc-200 font-black text-[10px] text-black uppercase px-6 rounded-2xl shadow-sm hover:bg-zinc-50">
            <Download className="h-4 w-4 mr-2" /> RELATÓRIO MESTRE
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-black">
        {/* Parecer Neural: A IA dita os números e a estratégia */}
        {metrics.neuralAnalysis && (
          <Card className="rounded-[2.5rem] border-2 border-black/10 bg-zinc-50 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
            <CardContent className="p-10 flex gap-8 items-start">
               <div className="h-16 w-16 rounded-3xl bg-black text-white flex items-center justify-center shrink-0 shadow-2xl">
                 <BrainCircuit className="h-8 w-8" />
               </div>
               <div className="space-y-4">
                 <div className="flex items-center gap-3">
                   <h3 className="text-sm font-black uppercase tracking-widest text-black">Parecer de Diretoria Neural</h3>
                   <Badge className="bg-black text-white text-[8px] font-black uppercase">V75 ELITE AI</Badge>
                 </div>
                 <p className="text-sm font-semibold leading-relaxed text-black italic">
                   "{metrics.neuralAnalysis}"
                 </p>
               </div>
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-3xl border-2 border-red-100 bg-red-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Urgência Máxima (N)</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-red-600"><ShieldAlert className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-red-600">{metrics.reallyOverdue?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-orange-100 bg-orange-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Atrasos Recentes</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-orange-500"><Clock className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-orange-600">{metrics.commonOverdue?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-blue-100 bg-blue-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Prazos Hoje</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-blue-600"><Calendar className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-blue-600">{metrics.todayPrazos?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-zinc-200 bg-zinc-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Carteira Ativa</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-black"><Layers className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-black">{metrics.activePortfolio?.length || 0}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <Card className="lg:col-span-7 rounded-[2.5rem] border-2 border-zinc-100 shadow-xl bg-white overflow-hidden">
             <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-4 w-4 text-black" />
                    Eficiência Operacional
                  </h3>
                  <p className="text-[10px] text-black/50 font-bold uppercase tracking-widest mt-1">Pontuação Gabinete: <span className="text-black font-black">{metrics.efficiencyScore || 0}%</span></p>
                </div>
                <Badge className="bg-black text-white font-black text-[8px] uppercase px-3 py-1">V75 ELITE</Badge>
             </CardHeader>
             <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Saúde da Carteira</span>
                      <span className="text-5xl font-black text-black">{metrics.efficiencyScore || 0}%</span>
                      <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1">ESTABILIZADO <ArrowRight className="h-3 w-3" /></span>
                   </div>
                   <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Alerta de Risco</span>
                      <div className={cn(
                        "text-xs font-black uppercase tracking-widest px-6 py-2 rounded-2xl",
                        (metrics.reallyOverdue?.length || 0) > 5 ? "bg-red-600 text-white" : "bg-green-600 text-white"
                      )}>
                        {(metrics.reallyOverdue?.length || 0) > 5 ? "ALTO RISCO" : "SOB CONTROLE"}
                      </div>
                      <span className="text-[9px] font-black text-black/40 uppercase tracking-widest pt-2">V75 NEURAL</span>
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="lg:col-span-5 rounded-[2.5rem] border-none bg-black text-white shadow-2xl p-10 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl group-hover:bg-white/10 transition-all"></div>
              <div className="relative z-10 space-y-6">
                <Badge className="bg-white/10 text-white font-black px-4 py-1.5 text-[9px] tracking-widest border-none">W1 ELITE INTELLIGENCE</Badge>
                <h3 className="text-3xl font-black leading-tight tracking-tight uppercase">Gabinete Neural V75 Elite</h3>
                <p className="text-white/60 text-sm font-medium leading-relaxed">
                  O protocolo V75 Elite utiliza a IA escolhida para ler instantaneamente sua planilha e sugerir ações de mitigação de riscos baseadas estritamente na Coluna N.
                </p>
                <div className="flex gap-6 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Prazos Hoje</span>
                    <span className="text-xs font-black uppercase">{metrics.todayPrazos?.length || 0} CASOS</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10 pl-6">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Motor</span>
                    <span className="text-xs font-black uppercase">NEURAL V75</span>
                  </div>
                </div>
              </div>
           </Card>
        </section>
      </div>
    </div>
  );
}