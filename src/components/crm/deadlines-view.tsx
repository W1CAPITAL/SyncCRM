
"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { parse, isBefore, isToday, startOfDay, isValid, subDays } from "date-fns";
import { MessageSquare, Clock, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SheetIndices } from "./sheet-explorer";

interface DeadlinesViewProps {
  data: any[];
  headers: string[];
  indices: SheetIndices;
  onEdit: (rowObj: any, colIdx: number, value: string) => void;
  onWhatsApp: (row: any) => void;
  onReschedule: (row: any) => void;
}

export function DeadlinesView({ data, headers, indices, onEdit, onWhatsApp, onReschedule }: DeadlinesViewProps) {
  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const criticalThreshold = subDays(today, 5);
    
    const reallyOverdue: any[] = [];
    const commonOverdue: any[] = [];
    const todayList: any[] = [];
    const upcoming: any[] = [];

    const INACTIVE_KEYWORDS = [
      "ENCERRADO", "ARQUIVADO", "BAIXADO", "FINALIZADO", "EXTINTO", 
      "SUSPENSO", "SOBRESTADO", "JULGADO", "CANCELADO", "INATIVO"
    ];

    data.forEach((row) => {
      const st = String(row[`col_${indices.status}`] || "").toUpperCase().trim();
      const isInactive = INACTIVE_KEYWORDS.some(k => st.includes(k));
      if (isInactive) return;

      const proxStr = String(row[`col_${indices.nextDate}`] || "").trim();
      if (!proxStr || proxStr === "0" || proxStr === "") return;

      try {
        const parts = proxStr.split(' ')[0].split(/[\/\-]/);
        let proxDate;
        if (parts[0].length === 4) proxDate = new Date(proxStr);
        else {
          proxDate = parse(proxStr.split(' ')[0], 'dd/MM/yyyy', new Date());
          if (!isValid(proxDate)) proxDate = parse(proxStr.split(' ')[0], 'dd/MM/yy', new Date());
        }

        if (!isValid(proxDate)) return;

        const isSuspended = String(row[`col_${indices.suspended}`] || "").toLowerCase() === "true" || 
                           String(row[`col_${indices.suspended}`] || "").toLowerCase() === "sim";
                           
        const item = { ...row, parsedDate: proxDate, isSuspended };
        const proxStart = startOfDay(proxDate);

        if (isBefore(proxStart, today)) {
          if (isBefore(proxStart, criticalThreshold) || isSuspended) {
            reallyOverdue.push(item);
          } else {
            commonOverdue.push(item);
          }
        } else if (isToday(proxStart)) {
          todayList.push(item);
        } else {
          upcoming.push(item);
        }
      } catch (e) {}
    });

    const sortFn = (a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime();

    return { 
      reallyOverdue: reallyOverdue.sort(sortFn),
      commonOverdue: commonOverdue.sort(sortFn),
      today: todayList, 
      upcoming: upcoming.sort(sortFn) 
    };
  }, [data, indices]);

  const renderGroup = (title: string, items: any[], type: 'really_overdue' | 'common_overdue' | 'today' | 'upcoming') => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className={cn(
            "text-sm font-black uppercase tracking-widest flex items-center gap-2",
            type === 'really_overdue' ? "text-zinc-950" : 
            type === 'common_overdue' ? "text-red-600" : 
            type === 'today' ? "text-amber-600" : "text-green-600"
          )}>
            {type === 'really_overdue' && <AlertCircle className="h-4 w-4 text-red-600" />}
            {type === 'common_overdue' && <AlertTriangle className="h-4 w-4" />}
            {title} <Badge variant="secondary" className="text-[10px] ml-2 font-black">{items.length}</Badge>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className={cn(
              "shadow-sm border-l-4 transition-all hover:shadow-md bg-white",
              type === 'really_overdue' ? "border-l-zinc-950 bg-zinc-50/50" : 
              type === 'common_overdue' ? "border-l-red-600" : 
              type === 'today' ? "border-l-amber-500" : "border-l-green-500"
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Cliente / Processo</p>
                    <p className="text-[11px] font-bold text-zinc-900 truncate uppercase">{String(item[`col_${indices.client}`] || "N/A")}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] font-black", 
                    type === 'really_overdue' ? "bg-zinc-900 text-white border-zinc-900" : 
                    type === 'common_overdue' ? "bg-red-50 text-red-600 border-red-200" : "bg-zinc-50"
                  )}>
                    {item[`col_${indices.nextDate}`]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 py-2 border-y border-zinc-100">
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Status Atual</p>
                    <p className="text-[10px] font-medium truncate uppercase">{item[`col_${indices.status}`] || "--"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Prioridade</p>
                    <p className={cn("text-[9px] font-black uppercase", 
                      type === 'really_overdue' ? "text-red-600" : 
                      type === 'common_overdue' ? "text-red-500" : "text-zinc-400")}>
                      {type === 'really_overdue' ? "URGÊNCIA MÁXIMA" : type === 'common_overdue' ? "ATENÇÃO ALTA" : "NORMAL"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full text-green-600 border-green-100" onClick={() => onWhatsApp(item)}>
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold flex-1" onClick={() => onReschedule(item)}>
                    <Clock className="h-3.5 w-3.5 mr-2" /> REAGENDAR
                  </Button>
                  <Button variant="default" size="sm" className="h-7 text-[9px] font-bold flex-1 bg-zinc-900 text-white" onClick={() => onEdit(item, indices.status, "ENCERRADO")}>
                    <CheckCircle className="h-3.5 w-3.5 mr-2" /> CONCLUIR
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Controle de Prazos</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Diferenciação Crítica V8 | SLA 5 Dias</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="bg-zinc-900 text-white border-zinc-900 px-3 py-1 font-black">{groups.reallyOverdue.length} CRÍTICO MÁXIMO</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 px-3 py-1 font-black">{groups.commonOverdue.length} ATRASO RECENTE</Badge>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-8" id="deadlines-scroll-area">
        <div className="max-w-7xl mx-auto w-full">
          {renderGroup("🚨 Urgência Máxima (Realmente Crítico)", groups.reallyOverdue, 'really_overdue')}
          {renderGroup("🟠 Atrasos Recentes (Crítico Comum)", groups.commonOverdue, 'common_overdue')}
          {renderGroup("🟡 Compromissos de Hoje", groups.today, 'today')}
          {renderGroup("🟢 Próximos Vencimentos", groups.upcoming, 'upcoming')}
        </div>
      </div>
    </div>
  );
}
