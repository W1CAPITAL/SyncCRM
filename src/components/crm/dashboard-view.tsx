"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, Target, Download, ShieldAlert, Layers, Clock, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UnifiedMetrics } from "@/lib/metrics-engine";

interface DashboardProps {
  metrics: UnifiedMetrics;
}

export function DashboardView({ metrics }: DashboardProps) {
  const topLawyers = useMemo(() => {
    return Object.entries(metrics.lawyersPerformance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [metrics.lawyersPerformance]);

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b px-10 py-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase leading-none">Visão Executiva</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Painel de Gabinete | W1 Intelligence</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="h-10 border-zinc-200 bg-white px-5 rounded-xl font-black text-[10px] uppercase shadow-sm">
            {metrics.closedWithAppointment.length} ARQUIVADOS COM AGENDA
          </Badge>
          <Button variant="outline" className="h-12 border-2 border-zinc-200 font-black text-[10px] uppercase px-6 rounded-2xl shadow-sm hover:bg-zinc-50">
            <Download className="h-4 w-4 mr-2" /> RELATÓRIO MESTRE
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-black">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-3xl border-2 border-red-100 bg-red-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Urgência Máxima</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-red-600"><ShieldAlert className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-red-600">{metrics.reallyOverdue.length}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-orange-100 bg-orange-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Atrasos Recentes</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-orange-500"><Clock className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-orange-600">{metrics.commonOverdue.length}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-blue-100 bg-blue-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">No Prazo (&gt; 7 dias)</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-blue-600"><Calendar className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-blue-600">{metrics.onTimePrazos.length}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-zinc-200 bg-zinc-50 shadow-sm">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carteira Ativa</p>
                <div className="p-2 rounded-xl bg-white shadow-md text-zinc-900"><Layers className="h-5 w-5" /></div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-zinc-900">{metrics.activePortfolio.length}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <Card className="lg:col-span-7 rounded-[2.5rem] border-2 border-zinc-100 shadow-xl bg-white overflow-hidden">
             <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Eficiência Operacional
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Pontuação Neural: <span className="text-zinc-900">{metrics.efficiencyScore}%</span></p>
                </div>
                <Badge className="bg-green-600 text-white font-black text-[8px] uppercase px-3 py-1">V28 SHIELD</Badge>
             </CardHeader>
             <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saúde da Carteira</span>
                      <span className="text-5xl font-black text-zinc-900">{metrics.efficiencyScore}%</span>
                      <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1">ESTABILIZADO <ArrowRight className="h-3 w-3" /></span>
                   </div>
                   <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alerta de Risco</span>
                      <div className={cn(
                        "text-xs font-black uppercase tracking-widest px-6 py-2 rounded-2xl",
                        metrics.reallyOverdue.length > 5 ? "bg-red-600 text-white" : "bg-green-600 text-white"
                      )}>
                        {metrics.reallyOverdue.length > 5 ? "ALTO RISCO" : "SOB CONTROLE"}
                      </div>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pt-2">V28 ELITE ENGINE</span>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center py-4 border-b">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Prazos de Hoje</span>
                      <span className="text-sm font-black text-zinc-900">{metrics.todayPrazos.length} CASOS</span>
                   </div>
                   <div className="flex justify-between items-center py-4 border-b">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">SLA Médio Equipe</span>
                      <span className="text-sm font-black text-zinc-900">48 HORAS</span>
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="lg:col-span-5 rounded-[2.5rem] border-none bg-zinc-950 text-white shadow-2xl p-10 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl group-hover:bg-primary/30 transition-all"></div>
              <div className="relative z-10 space-y-6">
                <Badge className="bg-primary text-white font-black px-4 py-1.5 text-[9px] tracking-widest border-none">W1 ELITE INTELLIGENCE</Badge>
                <h3 className="text-3xl font-black leading-tight tracking-tight uppercase">Gestão Blindada V28 Elite</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                  O protocolo V28 Elite isola automaticamente casos arquivados com agendamentos, garantindo que sua métrica de eficiência reflita apenas a realidade operacional ativa.
                </p>
                <div className="flex gap-6 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Tribunais</span>
                    <span className="text-xs font-black">{Object.keys(metrics.tribunaisVolume).length} ATIVOS</span>
                  </div>
                  <div className="flex flex-col border-l border-zinc-800 pl-6">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Motor</span>
                    <span className="text-xs font-black uppercase">NEURAL X1</span>
                  </div>
                </div>
              </div>
              <div className="relative z-10 pt-10 flex items-center gap-4 text-zinc-700 font-black text-[9px] tracking-widest uppercase">
                 <div className="h-px flex-1 bg-zinc-900"></div>
                 CONSULTORIA ELITE
                 <div className="h-px flex-1 bg-zinc-900"></div>
              </div>
           </Card>
        </section>
      </div>
    </div>
  );
}