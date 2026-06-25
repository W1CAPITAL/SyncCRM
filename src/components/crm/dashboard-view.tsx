
"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Users, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { startOfDay, isBefore, isToday, isValid, parse, subDays } from "date-fns";

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
    if (parts[0].length === 4) date = new Date(str);
    else {
      date = parse(str, 'dd/MM/yyyy', new Date());
      if (!isValid(date)) date = parse(str, 'dd/MM/yy', new Date());
    }
    return isValid(date) ? startOfDay(date) : null;
  } catch { return null; }
};

export function DashboardView({ data, indices }: DashboardProps) {
  const stats = useMemo(() => {
    const hoje = startOfDay(new Date());
    const limiteCritico = subDays(hoje, 5); // Mais de 5 dias é "Realmente Crítico"
    
    let reallyOverdue = 0; // Realmente Crítico (> 5 dias ou Alerta Ativo)
    let commonOverdue = 0; // Crítico Comum (1-5 dias)
    let today = 0;
    let active = 0;

    if (!data.length) return { reallyOverdue, commonOverdue, today, active };

    data.forEach(row => {
      const st = String(row[`col_${indices.status}`] || "").toUpperCase().trim();
      const isInativo = INACTIVE_KEYWORDS.some(k => st.includes(k));
      if (isInativo) return;

      active++;
      const proxDate = parseSheetDate(row[`col_${indices.nextDate}`]);
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

    return { reallyOverdue, commonOverdue, today, active };
  }, [data, indices]);

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 overflow-hidden">
      <header className="bg-white border-b p-6 flex items-center justify-between shrink-0 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Painel de Controle</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Inteligência Tática V8 | Realmente Crítico vs Comum</p>
        </div>
        <div className="flex gap-2">
           <Badge variant="outline" className="h-8 border-red-300 text-red-700 bg-red-50 flex items-center gap-2 px-3">
             <AlertCircle className="h-3 w-3" />
             <span className="font-black text-[10px]">{stats.reallyOverdue} URGÊNCIA MÁXIMA</span>
           </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-black">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-black bg-zinc-900 text-white shadow-xl transition-transform hover:scale-[1.02]">
            <CardContent className="pt-6 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase text-zinc-400 mb-1 tracking-widest">Realmente Crítico</p>
                <p className="text-4xl font-black text-white">{stats.reallyOverdue}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-600 bg-white shadow-md transition-transform hover:scale-[1.02]">
            <CardContent className="pt-6 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase text-red-600 mb-1 tracking-widest">Crítico Comum</p>
                <p className="text-4xl font-black text-red-600">{stats.commonOverdue}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-white shadow-md transition-transform hover:scale-[1.02]">
            <CardContent className="pt-6 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase text-amber-600 mb-1 tracking-widest">Prazos de Hoje</p>
                <p className="text-4xl font-black text-amber-500">{stats.today}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600 bg-white shadow-md transition-transform hover:scale-[1.02]">
            <CardContent className="pt-6 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase text-blue-600 mb-1 tracking-widest">Carteira Ativa</p>
                <p className="text-4xl font-black text-blue-600">{stats.active}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="bg-white border-zinc-200">
             <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-lg"><Users className="h-5 w-5 text-white" /></div>
                  <h3 className="font-black uppercase text-sm">Saúde da Carteira</h3>
                </div>
                <div className="space-y-4 pt-4">
                   <div className="flex justify-between items-end border-b pb-2">
                     <span className="text-[11px] font-bold text-zinc-500 uppercase">Eficiência Geral</span>
                     <span className="text-sm font-black text-zinc-900">{stats.active > 0 ? Math.round(((stats.active - (stats.reallyOverdue + stats.commonOverdue)) / stats.active) * 100) : 100}%</span>
                   </div>
                   <div className="flex justify-between items-end border-b pb-2">
                     <span className="text-[11px] font-bold text-zinc-500 uppercase">Nível de Alerta</span>
                     <span className={cn("text-sm font-black uppercase", stats.reallyOverdue > 0 ? "text-red-600" : "text-green-600")}>
                        {stats.reallyOverdue > 5 ? "🚨 CRÍTICO EXTREMO" : stats.reallyOverdue > 0 ? "⚠️ ALERTA VERMELHO" : "✅ SOB CONTROLE"}
                     </span>
                   </div>
                </div>
             </CardContent>
           </Card>
           <Card className="bg-zinc-900 text-white border-none shadow-xl">
             <CardContent className="p-8 flex flex-col justify-center h-full space-y-4">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Diferenciação AI V8</p>
                <p className="text-lg font-medium leading-tight">
                  Identificamos <span className="text-red-500 font-black">{stats.reallyOverdue} pendências realmente críticas</span> que exigem intervenção imediata por estarem fora do SLA de 5 dias ou com marcadores de suspensão.
                </p>
             </CardContent>
           </Card>
        </section>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
