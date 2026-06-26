"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, CheckCircle, Clock, Target, UserCheck, AlertCircle } from "lucide-react";
import { UnifiedMetrics } from "@/lib/metrics-engine";
import { cn } from "@/lib/utils";

interface AuditViewProps {
  metrics: UnifiedMetrics;
}

export function AuditView({ metrics }: AuditViewProps) {
  const sortedAudits = useMemo(() => {
    return Object.values(metrics.lawyerAudit).sort((a, b) => b.total - a.total);
  }, [metrics.lawyerAudit]);

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b px-10 py-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Auditoria de Responsáveis</h2>
          <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-2">Gabinete de Performance | W1 Intelligence</p>
        </div>
        <div className="flex gap-3">
          <Badge className="bg-black text-white px-5 py-2 font-black rounded-xl text-[10px] uppercase shadow-lg">V53 AUDIT SHIELD</Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-8 scroll-black">
        <div className="grid grid-cols-1 gap-6">
          {sortedAudits.map((audit, idx) => (
            <Card key={idx} className="rounded-3xl border-2 border-zinc-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="p-8 bg-zinc-950 text-white md:w-80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Responsável Sênior</span>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{audit.name}</h3>
                    </div>
                    <div className="mt-8">
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total em Carteira</p>
                       <p className="text-4xl font-black">{audit.total}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-black uppercase tracking-widest">Score de Eficiência</span>
                         <span className={cn(
                           "text-xl font-black",
                           audit.efficiency > 80 ? "text-green-600" : audit.efficiency > 50 ? "text-orange-500" : "text-red-600"
                         )}>{audit.efficiency}%</span>
                       </div>
                       <Progress value={audit.efficiency} className="h-3 bg-zinc-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                          <p className="text-[8px] font-black text-red-600 uppercase mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Críticos</p>
                          <p className="text-xl font-black text-red-600">{audit.reallyOverdue}</p>
                       </div>
                       <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                          <p className="text-[8px] font-black text-blue-600 uppercase mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Hoje</p>
                          <p className="text-xl font-black text-blue-600">{audit.today}</p>
                       </div>
                    </div>

                    <div className="flex flex-col justify-center space-y-2">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-black uppercase">
                          <CheckCircle className="h-3 w-3 text-green-600" /> {audit.onTime} No Prazo
                       </div>
                       <div className={cn(
                         "p-3 rounded-xl text-center font-black text-[9px] uppercase tracking-widest",
                         audit.reallyOverdue > 5 ? "bg-red-600 text-white" : "bg-zinc-100 text-black"
                       )}>
                         {audit.reallyOverdue > 5 ? "INTERVENÇÃO NECESSÁRIA" : "OPERAÇÃO SAUDÁVEL"}
                       </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {sortedAudits.length === 0 && (
            <div className="h-96 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
              <Target className="h-20 w-20 text-black" />
              <div>
                <p className="font-black text-black uppercase text-xs tracking-widest">Nenhum Responsável Identificado</p>
                <p className="text-[10px] font-bold text-black uppercase">Sincronize sua planilha para gerar a auditoria</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative z-10 p-10 flex items-center gap-4 text-zinc-700 font-black text-[9px] tracking-widest uppercase">
         <div className="h-px flex-1 bg-zinc-200"></div>
         CONSULTORIA ELITE
         <div className="h-px flex-1 bg-zinc-200"></div>
      </div>
    </div>
  );
}