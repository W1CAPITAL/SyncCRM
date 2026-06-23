
"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Phone, MessageSquare, Download, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startOfDay, isBefore, isToday, isValid, parse } from "date-fns";
import { SheetIndices } from "./sheet-explorer";

interface DashboardProps {
  data: any[];
  headers: string[];
  indices: SheetIndices;
  onWhatsApp: (row: any, headers: string[]) => void;
  onReschedule: (row: any) => void;
  onNavigateToReports: () => void;
}

const INACTIVE_KEYWORDS = [
  "ENCERRADO", "ARQUIVADO", "BAIXADO", "FINALIZADO", "EXTINTO", 
  "SUSPENSO", "SOBRESTADO", "JULGADO", "CANCELADO", "SUCUMBÊNCIAS", 
  "SUCUMBÊNCIA", "INATIVO"
];

const parseSheetDate = (value: any) => {
  if (!value || value === "0" || String(value).trim() === "") return null;
  const str = String(value).trim().split(' ')[0];
  try {
    const parts = str.includes("/") ? str.split("/") : str.split("-");
    let date;
    if (parts[0].length === 4) date = new Date(str);
    else date = parse(str, 'dd/MM/yyyy', new Date());
    return isValid(date) ? startOfDay(date) : null;
  } catch {
    return null;
  }
};

export function DashboardView({ data, headers, indices, onWhatsApp, onReschedule, onNavigateToReports }: DashboardProps) {
  const stats = useMemo(() => {
    if (!data.length || !headers.length) return null;

    const hoje = startOfDay(new Date());
    const seenProcess = new Set();
    
    let overdueCount = 0;
    let todayContact = 0;
    let activeCount = 0;
    let urgentCases: any[] = [];

    data.forEach(row => {
      const proc = String(row[`col_${indices.process}`] || "").trim() || row._id;
      if (!proc || seenProcess.has(proc)) return;
      
      const st = String(row[`col_${indices.status}`] || "").toUpperCase().trim();
      const adv = String(row[`col_${indices.lawyer}`] || "").toUpperCase().trim();
      const susp = String(row[`col_${indices.suspended}`] || "").toUpperCase().trim();

      // Regra de Exclusão de Inativos
      const isInativo = INACTIVE_KEYWORDS.some(k => st.includes(k) || adv.includes(k) || susp.includes(k));
      if (isInativo) return;

      seenProcess.add(proc);
      activeCount++;

      // Cálculo de Prazos (Motor Universal V4)
      const proxDate = parseSheetDate(row[`col_${indices.nextDate}`]);
      if (proxDate) {
        if (isBefore(proxDate, hoje)) {
          overdueCount++;
          if (urgentCases.length < 20) urgentCases.push(row);
        } else if (isToday(proxDate)) {
          todayContact++;
          if (urgentCases.length < 20 && !urgentCases.includes(row)) urgentCases.push(row);
        }
      }
    });

    return { overdueCount, todayContact, active: activeCount, urgentCases };
  }, [data, indices]);

  if (!stats) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 overflow-hidden">
      <header className="bg-white border-b p-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Painel Geral</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Motor Universal V4</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> IMPRIMIR
          </Button>
          <Button size="sm" className="h-9 text-[10px] font-bold bg-zinc-900 text-white" onClick={onNavigateToReports}>
            <Download className="h-4 w-4 mr-2" /> RELATÓRIO BI
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-600 bg-white shadow-md">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-red-600">Atrasados (Anterior a Hoje)</p>
              <p className="text-4xl font-black text-red-600">{stats.overdueCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 bg-white shadow-md">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-amber-600">Pendências de Hoje</p>
              <p className="text-4xl font-black text-amber-500">{stats.todayContact}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-600 bg-white shadow-md">
            <CardContent className="pt-6">
              <p className="text-[10px] font-black uppercase text-blue-600">Carteira Ativa</p>
              <p className="text-4xl font-black text-blue-600">{stats.active}</p>
            </CardContent>
          </Card>
        </section>

        <Card className="bg-white overflow-hidden border-zinc-200">
          <div className="p-4 border-b flex items-center justify-between bg-zinc-50/50">
            <h3 className="text-xs font-black uppercase tracking-widest">Próximos Contatos Prioritários</h3>
            <Badge variant="destructive" className="text-[9px] font-black">URGENTE</Badge>
          </div>
          <div className="divide-y divide-zinc-100">
            {stats.urgentCases.map((row, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase truncate">{String(row[`col_${indices.client}`] || "Cliente").toUpperCase()}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase truncate">
                      PROC: {String(row[`col_${indices.process}`] || "--")} • RETORNO: {row[`col_${indices.nextDate}`]}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button size="sm" variant="outline" className="h-8 text-[9px] font-bold" onClick={() => onWhatsApp(row, headers)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> WHATSAPP
                  </Button>
                  <Button size="sm" className="h-8 text-[9px] font-bold bg-zinc-900 text-white" onClick={() => onReschedule(row)}>
                    DETALHES
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
