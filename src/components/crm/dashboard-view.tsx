
"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertCircle, Clock, CheckCircle2, TrendingUp, 
  Loader2, Phone, MessageSquare, Download, Printer 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parse, isBefore, isToday, startOfDay, isValid } from "date-fns";

interface DashboardProps {
  data: any[];
  headers: string[];
  onWhatsApp: (row: any, headers: string[]) => void;
  onReschedule: (row: any) => void;
  onNavigateToReports: () => void;
}

export function DashboardView({ data, headers, onWhatsApp, onReschedule, onNavigateToReports }: DashboardProps) {
  const stats = useMemo(() => {
    if (!data.length || !headers.length) return null;

    const today = startOfDay(new Date());
    
    // MAPEAMENTO RÍGIDO CONFORME PLANILHA DO CLIENTE
    const advIdx = 0;    // Coluna A
    const statusIdx = 2; // Coluna C
    const clientIdx = 3; // Coluna D
    const procIdx = 5;   // Coluna F
    const hIdx = 7;      // Coluna H
    const proxIdx = 13;  // Coluna N

    let overdueCount = 0;
    let todayContact = 0;
    let activeCount = 0;
    let urgentCases: any[] = [];

    data.forEach(row => {
      const st = String(row[`col_${statusIdx}`] || "").toUpperCase().trim();
      const adv = String(row[`col_${advIdx}`] || "").toUpperCase().trim();
      const colH = String(row[`col_${hIdx}`] || "").toUpperCase().trim();

      // REGRA DE FILTRO DE ATIVOS RIGOROSA
      const isClosed = 
        st.includes("ENCERRADO") || 
        st.includes("ARQUIVADO") || 
        st.includes("JULGADO") || 
        st.includes("SUCUMBENCIAS") ||
        adv === "ENCERRADO" ||
        colH === "SUSPENSO";

      if (!isClosed) {
        activeCount++;
        const proxStr = String(row[`col_${proxIdx}`] || "").trim();
        if (proxStr && proxStr !== "0") {
          try {
            const proxDate = parse(proxStr, 'dd/MM/yyyy', today);
            if (isValid(proxDate)) {
              const proxStart = startOfDay(proxDate);
              if (isBefore(proxStart, today)) {
                overdueCount++;
                if (urgentCases.length < 15) urgentCases.push(row);
              } else if (isToday(proxStart)) {
                todayContact++;
                if (urgentCases.length < 15 && !urgentCases.includes(row)) urgentCases.push(row);
              }
            }
          } catch (e) {}
        }
      }
    });

    return { overdueCount, todayContact, active: activeCount, urgentCases, clientIdx, procIdx, headers };
  }, [data, headers]);

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Processando Inteligência de Prazos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 overflow-hidden">
      <header className="bg-white border-b p-4 flex items-center justify-between shrink-0 print:hidden">
        <div>
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Painel de Operações</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Gestão de Carteira Ativa (Filtro Colunas A, C e H)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> IMPRIMIR
          </Button>
          <Button size="sm" className="h-9 text-[10px] font-bold bg-zinc-900 text-white" onClick={onNavigateToReports}>
            <Download className="h-4 w-4 mr-2" /> GERAR RELATÓRIO EXECUTIVO
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8" id="dashboard-scroll-area">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-600 bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Atrasados (Próximo &lt; Hoje)</p>
                  <p className="text-4xl font-black text-red-600 tabular-nums">{stats.overdueCount}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Pendências de Hoje</p>
                  <p className="text-4xl font-black text-amber-500 tabular-nums">{stats.todayContact}</p>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-500" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-600 bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Carteira Ativa Real</p>
                  <p className="text-4xl font-black text-blue-600 tabular-nums">{stats.active}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="shadow-sm border-none bg-white">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest">Ações Prioritárias de Retorno</h3>
            <Badge variant="destructive" className="text-[9px] font-black">URGENTE</Badge>
          </div>
          <div className="divide-y divide-zinc-50">
            {stats.urgentCases.map((row, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate uppercase">
                      {String(row[`col_${stats.clientIdx}`] || "Cliente").toUpperCase()}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase truncate">
                      PROC: {String(row[`col_${stats.procIdx}`] || "--")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-[9px] font-bold" onClick={() => onWhatsApp(row, stats.headers)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> WHATSAPP
                  </Button>
                  <Button size="sm" className="h-8 text-[9px] font-bold bg-zinc-900 text-white" onClick={() => onReschedule(row)}>
                    REAGENDAR
                  </Button>
                </div>
              </div>
            ))}
            {stats.urgentCases.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Sem pendências críticas para hoje!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
