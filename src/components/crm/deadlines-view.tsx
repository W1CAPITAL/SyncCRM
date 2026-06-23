
"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { parse, isBefore, isToday, startOfDay, isValid } from "date-fns";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeadlinesViewProps {
  data: any[];
  headers: string[];
  onEdit: (r: number, c: number, v: string) => void;
  onWhatsApp: (row: any, headers: string[]) => void;
  onReschedule: (row: any) => void;
}

export function DeadlinesView({ data, headers, onEdit, onWhatsApp, onReschedule }: DeadlinesViewProps) {
  // MAPEAMENTO FIXO SEGUNDO ESPECIFICAÇÃO
  const statusIdx = 2; // Coluna C
  const clientIdx = 3; // Coluna D
  const retIdx = 12;    // Coluna M (Retorno)
  const proxIdx = 13;   // Coluna N (Próximo)

  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const overdue: any[] = [];
    const todayList: any[] = [];
    const upcoming: any[] = [];

    data.forEach((row, i) => {
      const statusVal = String(row[`col_${statusIdx}`] || "").toUpperCase();
      const isClosed = statusVal.includes("ENCERRADO") || statusVal.includes("ARQUIVADO") || statusVal.includes("JULGADO");
      if (isClosed) return;

      const proxStr = String(row[`col_${proxIdx}`] || "").trim();
      if (!proxStr || proxStr === "0") return;

      try {
        const proxDate = parse(proxStr, 'dd/MM/yyyy', new Date());
        if (!isValid(proxDate)) return;

        const item = { ...row, originalIdx: i, parsedDate: proxDate };

        if (isBefore(proxDate, today)) {
          overdue.push(item);
        } else if (isToday(proxDate)) {
          todayList.push(item);
        } else {
          upcoming.push(item);
        }
      } catch (e) {}
    });

    const sortFn = (a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime();

    return { 
      overdue: overdue.sort(sortFn), 
      today: todayList,
      upcoming: upcoming.sort(sortFn)
    };
  }, [data, proxIdx]);

  const renderGroup = (title: string, items: any[], type: 'overdue' | 'today' | 'upcoming') => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className={cn(
            "text-sm font-black uppercase tracking-widest flex items-center gap-2",
            type === 'overdue' ? "text-red-600" : type === 'today' ? "text-amber-600" : "text-green-600"
          )}>
            {title} <Badge variant="secondary" className="text-[10px] ml-2">{items.length}</Badge>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item._id} className={cn(
              "shadow-sm border-l-4 transition-all hover:shadow-md bg-white",
              type === 'overdue' ? "border-l-red-600" : type === 'today' ? "border-l-amber-500" : "border-l-green-500"
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Caso / Cliente</p>
                    <p className="text-[11px] font-bold text-zinc-900 truncate max-w-[180px]">{String(item[`col_${clientIdx}`] || "N/A").toUpperCase()}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-bold",
                    type === 'overdue' ? "bg-red-50 text-red-600 border-red-200" : "bg-zinc-50"
                  )}>
                    {item[`col_${proxIdx}`]}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 py-2 border-y border-zinc-50">
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Último Retorno</p>
                    <p className="text-[10px] font-medium">{item[`col_${retIdx}`] || "--"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Status</p>
                    <p className={cn(
                      "text-[9px] font-black uppercase",
                      type === 'overdue' ? "text-red-600" : type === 'today' ? "text-amber-600" : "text-green-600"
                    )}>
                      {type === 'overdue' ? "URGENTE" : type === 'today' ? "CONTATAR HOJE" : "PROGRAMADO"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full text-green-600 border-green-100 hover:bg-green-50" onClick={() => onWhatsApp(item, headers)}>
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[9px] flex-1" onClick={() => onReschedule(item)}>
                    <Clock className="h-3.5 w-3.5 mr-2" /> Reagendar
                  </Button>
                  <Button variant="default" size="sm" className="h-7 text-[9px] flex-1 bg-zinc-900" onClick={() => onEdit(parseInt(item._id), statusIdx, "ENCERRADO")}>
                    <CheckCircle className="h-3.5 w-3.5 mr-2" /> Concluir
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
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Análise baseada na Coluna N (Próximo Contato)</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 px-3 py-1 font-black">{groups.overdue.length} ATRASADOS</Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 px-3 py-1 font-black">{groups.today.length} HOJE</Badge>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto w-full">
          {renderGroup("🔴 Casos Críticos / Atrasados", groups.overdue, 'overdue')}
          {renderGroup("🟡 Pendências de Hoje", groups.today, 'today')}
          {renderGroup("🟢 Próximos Passos", groups.upcoming, 'upcoming')}
          
          {groups.overdue.length === 0 && groups.today.length === 0 && groups.upcoming.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-zinc-500 font-black uppercase text-xs tracking-widest">Tudo em dia! Sem pendências pendentes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
