"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Clock, CheckCircle, AlertCircle, AlertTriangle, Archive, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SheetIndices } from "./sheet-explorer";
import { UnifiedMetrics } from "@/lib/metrics-engine";

interface DeadlinesViewProps {
  metrics: UnifiedMetrics;
  indices: SheetIndices;
  onEdit: (rowObj: any, colIdx: number, value: string) => void;
  onWhatsApp: (row: any) => void;
}

export function DeadlinesView({ metrics, indices, onEdit, onWhatsApp }: DeadlinesViewProps) {
  const renderGroup = (title: string, items: any[], type: 'really' | 'common' | 'today' | 'onTime' | 'closed') => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg shadow-sm",
              type === 'really' ? "bg-red-100 text-red-600" :
              type === 'common' ? "bg-orange-100 text-orange-600" :
              type === 'today' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
            )}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Segmentação V51 Intelligence</p>
            </div>
          </div>
          <Badge className="h-8 px-4 rounded-xl font-black text-[10px] bg-slate-900 text-white border-none shadow-sm">
            {items.length} REGISTROS
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <Card key={idx} className={cn(
              "rounded-2xl shadow-sm border-l-[6px] transition-all hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden group",
              type === 'really' ? "border-l-red-600" : 
              type === 'common' ? "border-l-orange-500" : 
              type === 'today' ? "border-l-blue-500" : "border-l-slate-300"
            )}>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificação do Cliente</p>
                    <p className="text-[11px] font-bold text-slate-900 truncate uppercase leading-tight">{String(item[`col_${indices.client}`] || "---")}</p>
                  </div>
                  <div className="h-10 px-3 rounded-xl flex items-center justify-center font-black text-[10px] bg-slate-50 text-slate-600 shadow-inner">
                    {item[`col_${indices.nextDate}`]}
                  </div>
                </div>
                
                <div className="bg-slate-50/50 p-4 rounded-xl space-y-3 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Processo</span>
                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{String(item[`col_${indices.process}`] || "---")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Responsável</span>
                    <span className="text-[10px] font-bold text-slate-900 uppercase truncate max-w-[150px]">{String(item[`col_${indices.lawyer}`] || "---")}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl text-green-600 border-green-100 hover:bg-green-50 shadow-sm" onClick={() => onWhatsApp(item)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-10 text-[10px] font-bold flex-1 rounded-xl shadow-sm border-slate-200" onClick={() => onEdit(item, indices.status, "URGENTE")}>
                    <AlertCircle className="h-4 w-4 mr-2" /> CRÍTICO
                  </Button>
                  <Button variant="default" size="sm" className="h-10 text-[10px] font-bold flex-1 rounded-xl bg-slate-900 text-white shadow-lg hover:bg-slate-800" onClick={() => onEdit(item, indices.status, "ENCERRADO")}>
                    <CheckCircle className="h-4 w-4 mr-2" /> CONCLUIR
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
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
      <header className="bg-white border-b p-8 shadow-sm shrink-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda Operacional V51</h2>
            <p className="text-sm font-medium text-slate-500">Segmentação Estratégica Baseada no Próximo Prazo (Coluna N)</p>
          </div>
          <Badge className="bg-red-600 text-white px-5 py-2 font-black rounded-xl shadow-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {metrics.reallyOverdue.length} URGÊNCIA MÁXIMA
          </Badge>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-10 scroll-black">
        <div className="max-w-7xl mx-auto w-full">
          {renderGroup("🚨 Urgência Máxima (Críticos & > 5 dias)", metrics.reallyOverdue, 'really')}
          {renderGroup("🟠 Atrasos Recentes", metrics.commonOverdue, 'common')}
          {renderGroup("🔵 Compromissos de Hoje", metrics.todayPrazos, 'today')}
          {renderGroup("⚪ No Prazo (Futuros)", metrics.onTimePrazos, 'onTime')}
          {renderGroup("🔘 Histórico: Arquivados com Agenda", metrics.closedWithAppointment, 'closed')}
        </div>
      </div>
    </div>
  );
}
