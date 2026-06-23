
"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { parse, isBefore, isToday, startOfDay, isValid } from "date-fns";
import { Phone, MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DeadlinesViewProps {
  data: any[];
  headers: string[];
  onEdit: (r: number, c: number, v: string) => void;
  onWhatsApp: (row: any, headers: string[]) => void;
  onReschedule: (row: any) => void;
}

export function DeadlinesView({ data, headers, onEdit, onWhatsApp, onReschedule }: DeadlinesViewProps) {
  const getIdx = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()));
  const proxIdx = getIdx("PRÓXIMO");
  const retIdx = getIdx("RETORNO");
  const clientIdx = headers.findIndex(h => h.toUpperCase() === "CLIENTE" || h.toUpperCase() === "NOME");
  const telIdx = headers.findIndex(h => h.toUpperCase().includes("TELEFONE") || h.toUpperCase().includes("CELULAR"));

  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const overdue: any[] = [];
    const todayList: any[] = [];
    const upcoming: any[] = [];

    data.forEach((row, i) => {
      // Ignora casos encerrados ou sem data de próximo
      const statusIdx = headers.findIndex(h => h.toUpperCase().includes("STATUS"));
      const statusVal = String(row[`col_${statusIdx}`] || "").toUpperCase();
      const isClosed = statusVal.includes("ENCERRADO") || statusVal.includes("ARQUIVADO") || statusVal.includes("JULGADO");
      if (isClosed) return;

      const proxStr = String(row[`col_${proxIdx}`] || "").trim();
      if (!proxStr) return;

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

    return { 
      overdue: overdue.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()), 
      today: todayList,
      upcoming: upcoming.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
    };
  }, [data, headers, proxIdx]);

  const renderGroup = (title: string, items: any[], type: 'overdue' | 'today' | 'upcoming') => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-4 mb-8">
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
              type === 'overdue' ? "border-l-red-600" : type === 'today' ? "border-l-amber-50" : "border-l-green-500"
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
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Situação</p>
                    <p className={cn(
                      "text-[9px] font-black uppercase",
                      type === 'overdue' ? "text-red-600" : type === 'today' ? "text-amber-600" : "text-green-600"
                    )}>
                      {type === 'overdue' ? "URGENTE / ATRASADO" : type === 'today' ? "CONTATAR HOJE" : "PRÓXIMO CONTATO"}
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
                  <Button variant="default" size="sm" className="h-7 text-[9px] flex-1 bg-zinc-900" onClick={() => onEdit(parseInt(item._id), headers.findIndex(h => h.toUpperCase().includes("STATUS")), "ENCERRADO")}>
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
    <div className="flex-1 flex flex-col bg-zinc-50/30 overflow-hidden">
      <header className="bg-white border-b p-6 shadow-sm z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Controle de Prazos Decisivo</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Baseado na coluna Próximo</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 px-3 py-1 font-black">{groups.overdue.length} ATRASADOS</Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 px-3 py-1 font-black">{groups.today.length} HOJE</Badge>
          </div>
        </div>
      </header>
      
      <ScrollArea className="flex-1 p-8">
        <div className="max-w-7xl mx-auto w-full">
          {renderGroup("🔴 Urgentes / Atrasados", groups.overdue, 'overdue')}
          {renderGroup("🟡 Contatar Hoje", groups.today, 'today')}
          {renderGroup("🟢 Próximos Contatos", groups.upcoming, 'upcoming')}
          
          {groups.overdue.length === 0 && groups.today.length === 0 && groups.upcoming.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-zinc-500 font-black uppercase text-xs tracking-widest">Tudo em dia! Nenhum prazo pendente para agora.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
