"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parse, isBefore, isToday, startOfDay, isValid, subDays } from "date-fns";
import { MessageSquare, Clock, CheckCircle, AlertCircle, AlertTriangle, Archive, User, Calendar, ExternalLink } from "lucide-react";
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

const INACTIVE_KEYWORDS = [
  "ENCERRADO", "ARQUIVADO", "BAIXADO", "FINALIZADO", "EXTINTO", 
  "JULGADO", "CANCELADO", "INATIVO"
];

export function DeadlinesView({ data, headers, indices, onEdit, onWhatsApp, onReschedule }: DeadlinesViewProps) {
  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const criticalThreshold = subDays(today, 5);
    
    const reallyOverdue: any[] = [];
    const commonOverdue: any[] = [];
    const todayList: any[] = [];
    const upcoming: any[] = [];
    const closedWithAppointment: any[] = [];

    data.forEach((row) => {
      const st = String(row[`col_${indices.status}`] || "").toUpperCase().trim();
      const proxStr = String(row[`col_${indices.nextDate}`] || "").trim();
      const hasAppointment = proxStr && proxStr !== "0" && proxStr !== "";
      
      const isClosed = INACTIVE_KEYWORDS.some(k => st.includes(k));

      if (isClosed && hasAppointment) {
        try {
          const parts = proxStr.split(' ')[0].split(/[\/\-]/);
          let proxDate;
          if (parts[0].length === 4) {
             proxDate = new Date(proxStr.split(' ')[0]);
          } else {
            proxDate = parse(proxStr.split(' ')[0], 'dd/MM/yyyy', new Date());
            if (!isValid(proxDate)) proxDate = parse(proxStr.split(' ')[0], 'dd/MM/yy', new Date());
          }
          
          const isLate = isValid(proxDate) && isBefore(startOfDay(proxDate), today);
          closedWithAppointment.push({ ...row, isClosed: true, parsedDate: proxDate, isLate });
        } catch (e) {
          closedWithAppointment.push({ ...row, isClosed: true, isLate: false });
        }
        return;
      }

      if (isClosed && !hasAppointment) return;
      if (!hasAppointment) return;

      try {
        const parts = proxStr.split(' ')[0].split(/[\/\-]/);
        let proxDate;
        if (parts[0].length === 4) {
           proxDate = new Date(proxStr.split(' ')[0]);
        } else {
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

    const sortFn = (a: any, b: any) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0);

    return { 
      reallyOverdue: reallyOverdue.sort(sortFn),
      commonOverdue: commonOverdue.sort(sortFn),
      today: todayList, 
      upcoming: upcoming.sort(sortFn),
      closedWithAppointment: closedWithAppointment.sort(sortFn)
    };
  }, [data, indices]);

  const renderGroup = (title: string, items: any[], type: 'really_overdue' | 'common_overdue' | 'today' | 'upcoming' | 'closed') => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {type === 'really_overdue' && <div className="p-2 bg-red-100 rounded-lg text-red-600 shadow-sm"><AlertCircle className="h-5 w-5" /></div>}
            {type === 'common_overdue' && <div className="p-2 bg-orange-100 rounded-lg text-orange-600 shadow-sm"><AlertTriangle className="h-5 w-5" /></div>}
            {type === 'today' && <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shadow-sm"><Calendar className="h-5 w-5" /></div>}
            {type === 'upcoming' && <div className="p-2 bg-green-100 rounded-lg text-green-600 shadow-sm"><Clock className="h-5 w-5" /></div>}
            {type === 'closed' && <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shadow-sm"><Archive className="h-5 w-5" /></div>}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Segmentação V28 Strategy</p>
            </div>
          </div>
          <Badge className={cn(
            "h-8 px-4 rounded-xl font-black text-[10px] border-none shadow-sm",
            type === 'really_overdue' ? "bg-red-600 text-white" : 
            type === 'common_overdue' ? "bg-orange-500 text-white" : 
            type === 'today' ? "bg-amber-500 text-white" : 
            type === 'closed' ? "bg-slate-500 text-white" : "bg-green-600 text-white"
          )}>
            {items.length} REGISTROS
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className={cn(
              "rounded-2xl shadow-sm border-l-[6px] transition-all hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden group",
              type === 'really_overdue' ? "border-l-red-600" : 
              type === 'common_overdue' ? "border-l-orange-500" : 
              type === 'today' ? "border-l-amber-500" : 
              type === 'closed' ? (item.isLate ? "border-l-amber-500" : "border-l-slate-300") : "border-l-green-600"
            )}>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Cliente Identificado</p>
                    <p className="text-[11px] font-bold text-slate-900 truncate uppercase leading-tight">{String(item[`col_${indices.client}`] || "N/A")}</p>
                  </div>
                  <div className={cn(
                    "h-10 px-3 rounded-xl flex items-center justify-center font-black text-[10px] shadow-inner",
                    type === 'really_overdue' ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"
                  )}>
                    {item[`col_${indices.nextDate}`]}
                  </div>
                </div>
                
                <div className="bg-slate-50/50 p-4 rounded-xl space-y-3 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Processo</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{String(item[`col_${indices.process}`] || "---")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Status</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 py-0 border-slate-200 bg-white truncate max-w-[120px]">{item[`col_${indices.status}`] || "S/ STATUS"}</Badge>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl text-green-600 border-green-100 hover:bg-green-50 shadow-sm" onClick={() => onWhatsApp(item)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-10 text-[10px] font-bold flex-1 rounded-xl shadow-sm border-slate-200 hover:bg-slate-50" onClick={() => onReschedule(item)}>
                    <Clock className="h-4 w-4 mr-2" /> REAGENDAR
                  </Button>
                  {type !== 'closed' && (
                    <Button variant="default" size="sm" className="h-10 text-[10px] font-bold flex-1 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98]" onClick={() => onEdit(item, indices.status, "ENCERRADO")}>
                      <CheckCircle className="h-4 w-4 mr-2" /> CONCLUIR
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
      <header className="bg-white border-b p-8 shadow-sm shrink-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda Tática de Prazos</h2>
            <p className="text-sm font-medium text-slate-500">Segmentação Estratégica W1 Capital | SLA 5 Dias</p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-slate-900 text-white px-5 py-2 font-black rounded-xl shadow-lg shadow-slate-900/10 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> {groups.reallyOverdue.length + groups.commonOverdue.length} EM ATRASO
            </Badge>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-10 scroll-black">
        <div className="max-w-7xl mx-auto w-full">
          {renderGroup("🚨 Urgência Máxima (Realmente Crítico)", groups.reallyOverdue, 'really_overdue')}
          {renderGroup("🟠 Atrasos Recentes (Fase Amarela)", groups.commonOverdue, 'common_overdue')}
          {renderGroup("🟡 Compromissos de Hoje", groups.today, 'today')}
          {renderGroup("🟢 Próximos Vencimentos (Controle)", groups.upcoming, 'upcoming')}
          {renderGroup("🔘 Arquivados com Agendamento", groups.closedWithAppointment, 'closed')}
        </div>
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}