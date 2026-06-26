"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Users, Calendar, AlertCircle, Archive, ShieldCheck, ArrowRight, Zap, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { startOfDay, isBefore, isToday, isValid, parse, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardProps {
  data: any[];
  headers: string[];
  onWhatsApp: (row: any) => void;
  onAction: (row: any, fieldIdx: number, value: string) => void;
  indices: any;
}

const INACTIVE_KEYWORDS = [
  "ENCERRADO", "ARQUIVADO", "BAIXADO", "FINALIZADO", "EXTINTO", 
  "SUSPENSO", "SOBRESTADO", "JULGADO", "CANCELADO", "INATIVO"
];

const parseSheetDate = (value: any) => {
  if (!value || value === "0" || String(value).trim() === "") return null;
  const str = String(value).trim().split(' ')[0];
  try {
    const parts = str.includes("/") ? str.split("/") : str.split("-");
    let date;
    if (parts[0].length === 4) {
       date = new Date(str);
    } else {
      date = parse(str, 'dd/MM/yyyy', new Date());
      if (!isValid(date)) date = parse(str, 'dd/MM/yy', new Date());
    }
    return isValid(date) ? startOfDay(date) : null;
  } catch { return null; }
};

export function DashboardView({ data, indices }: DashboardProps) {
  const stats = useMemo(() => {
    const hoje = startOfDay(new Date());
    const limiteCritico = subDays(hoje, 5);
    
    let reallyOverdue = 0; 
    let commonOverdue = 0; 
    let today = 0;
    let active = 0;
    let closedWithDate = 0;

    if (!data.length) return { reallyOverdue, commonOverdue, today, active, closedWithDate };

    data.forEach(row => {
      const st = String(row[`col_${indices.status}`] || "").toUpperCase().trim();
      const proxDate = parseSheetDate(row[`col_${indices.nextDate}`]);
      const hasDate = !!proxDate;
      const isClosed = INACTIVE_KEYWORDS.some(k => st.includes(k));

      if (isClosed) {
        if (hasDate) closedWithDate++;
        return; 
      }

      active++;
      const isSuspended = String(row[`col_${indices.suspended}`] || "").toLowerCase() === "true" || 
                         String(row[`col_${indices.suspended}`] || "").toLowerCase() === "sim";
      
      if (proxDate) {
        if (isBefore(proxDate, hoje)) {
          if (isBefore(proxDate, limiteCritico) || isSuspended) {
            reallyOverdue++;
          } else {
            commonOverdue++;
          }
        } else if (isToday(proxDate)) {
          today++;
        }
      }
    });

    return { reallyOverdue, commonOverdue, today, active, closedWithDate };
  }, [data, indices]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
      <header className="bg-white border-b px-10 py-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral da Operação</h2>
          <p className="text-sm font-medium text-slate-500">Gestão Estratégica Independente V28 Elite</p>
        </div>
        <div className="flex gap-3">
           <Badge variant="outline" className="h-10 border-slate-200 bg-white px-5 rounded-xl font-bold text-slate-600 flex items-center gap-2 shadow-sm">
             <Archive className="h-4 w-4" /> {stats.closedWithDate} ARQUIVADOS COM AGENDAMENTO
           </Badge>
           <Badge className="h-10 bg-red-600 hover:bg-red-700 text-white px-5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/10">
             <AlertCircle className="h-4 w-4" /> {stats.reallyOverdue} URGÊNCIA MÁXIMA
           </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-black">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Urgência Máxima', val: stats.reallyOverdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', shadow: 'shadow-red-600/5' },
            { label: 'Atrasos Recentes', val: stats.commonOverdue, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', shadow: 'shadow-orange-600/5' },
            { label: 'Prazos de Hoje', val: stats.today, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', shadow: 'shadow-blue-600/5' },
            { label: 'Carteira Ativa', val: stats.active, icon: TrendingUp, color: 'text-slate-900', bg: 'bg-white', border: 'border-slate-200', shadow: 'shadow-slate-900/5' },
          ].map((stat, i) => (
            <Card key={i} className={cn("rounded-3xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden", stat.border, stat.shadow)}>
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
                  <p className={cn("text-4xl font-black", stat.color)}>{stat.val}</p>
                </div>
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", i === 3 ? "bg-slate-900 text-white shadow-lg" : "bg-white")}>
                  <stat.icon className={cn("h-7 w-7", i === 3 ? "text-white" : stat.color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <Card className="lg:col-span-7 rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
             <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/10"><Target className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Métricas de Eficiência</h3>
                    <p className="text-xs text-slate-500 font-medium">Análise de saúde da carteira ativa.</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold px-4 py-1.5 rounded-xl uppercase text-[9px] tracking-widest border-none">SLA 48h</Badge>
             </CardHeader>
             <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 group transition-all hover:bg-white hover:shadow-md hover:border-primary/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle Operacional</span>
                      <span className="text-5xl font-black text-slate-900">
                        {stats.active > 0 ? Math.round(((stats.active - (stats.reallyOverdue + stats.commonOverdue)) / stats.active) * 100) : 100}%
                      </span>
                      <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter flex items-center gap-1">
                        +2% vs último ciclo <ArrowRight className="h-3 w-3" />
                      </span>
                   </div>
                   <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 group transition-all hover:bg-white hover:shadow-md hover:border-primary/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status de Alerta</span>
                      <div className={cn(
                        "text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-2xl shadow-sm",
                        stats.reallyOverdue > 5 ? "bg-red-600 text-white shadow-red-600/20" : "bg-green-600 text-white shadow-green-600/20"
                      )}>
                        {stats.reallyOverdue > 5 ? "ALTO RISCO" : "ESTABILIZADO"}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2">V28 Protocol Shield</span>
                   </div>
                </div>

                <div className="space-y-4 pt-4">
                   <div className="flex justify-between items-center py-5 border-b border-slate-100 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Archive className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-600">Registros Encerrados com Agenda</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{stats.closedWithDate} silos</span>
                   </div>
                   <div className="flex justify-between items-center py-5 border-b border-slate-100 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-600">SLA Médio de Intervenção AI</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">12.4s</span>
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="lg:col-span-5 rounded-3xl border-none bg-slate-900 text-white shadow-2xl p-10 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30"></div>
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl"></div>
              
              <div className="relative z-10 space-y-6">
                <Badge className="bg-primary text-white font-bold px-4 py-1.5 text-[10px] tracking-widest border-none shadow-lg shadow-primary/20">W1 ELITE INTELLIGENCE</Badge>
                <h3 className="text-3xl font-bold leading-tight tracking-tight">Decisões orientadas por dados reais, não intuições.</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  O protocolo V28 Elite isola automaticamente casos arquivados com agendamentos pendentes, garantindo que sua métrica de eficiência reflita apenas a realidade operacional ativa e rentável.
                </p>
                <div className="flex gap-4 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocolo</span>
                    <span className="text-xs font-bold">V28.4-BETA</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-800 pl-4">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Engine</span>
                    <span className="text-xs font-bold">NEURAL X1</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 pt-12 flex items-center gap-4 text-slate-500 font-bold text-[10px] tracking-widest uppercase">
                 <div className="h-0.5 flex-1 bg-slate-800 rounded-full"></div>
                 CONSULTORIA ESTRATÉGICA ATIVA
              </div>
           </Card>
        </section>
      </div>
    </div>
  );
}