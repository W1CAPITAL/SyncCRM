
"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertCircle, Clock, CheckCircle2, TrendingUp, 
  Loader2, Phone, MessageSquare 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parse, isBefore, isToday, startOfDay, isValid } from "date-fns";

interface DashboardProps {
  data: any[];
  headers: string[];
  onWhatsApp: (row: any, headers: string[]) => void;
  onReschedule: (row: any) => void;
}

// Função auxiliar para parsing robusto de datas da planilha
function parseFlexibleDate(val: string): Date | null {
  if (!val || val === "0") return null;
  const clean = val.trim();
  if (!clean) return null;

  // Formatos comuns em planilhas
  const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'M/d/yyyy'];
  
  for (const fmt of formats) {
    try {
      const d = parse(clean, fmt, new Date());
      if (isValid(d)) return d;
    } catch (e) {}
  }

  // Fallback para Date nativo se os formatos falharem
  const native = new Date(clean);
  if (isValid(native)) return native;

  return null;
}

export function DashboardView({ data, headers, onWhatsApp, onReschedule }: DashboardProps) {
  const stats = useMemo(() => {
    if (!data.length || !headers.length) return null;

    const today = startOfDay(new Date());
    
    // MAPEAMENTO DINÂMICO CONFORME ESPECIFICAÇÃO
    // Coluna N (Próximo) = Index 13
    // Coluna D (Cliente) = Index 3
    // Coluna F (Processo) = Index 5
    // Coluna C (Status) = Index 2
    const getIdx = (name: string, fallback: number) => {
      const idx = headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()));
      return idx !== -1 ? idx : fallback;
    };

    const statusIdx = getIdx("STATUS", 2);
    const clientIdx = getIdx("CLIENTE", 3);
    const proxIdx = getIdx("PRÓXIMO", 13); // Padrão Coluna N
    const procIdx = getIdx("PROCESSO", 5);

    let overdueCount = 0;
    let todayContact = 0;
    let active = 0;
    let urgentCases: any[] = [];

    data.forEach(row => {
      const st = String(row[`col_${statusIdx}`] || "").toUpperCase().trim();
      const isClosed = st.includes("ENCERRADO") || st.includes("ARQUIVADO") || st.includes("JULGADO");

      if (!isClosed) {
        active++;
        const proxStr = String(row[`col_${proxIdx}`] || "").trim();
        const proxDate = parseFlexibleDate(proxStr);
        
        if (proxDate) {
          const proxDateStart = startOfDay(proxDate);
          
          if (isBefore(proxDateStart, today)) {
            overdueCount++;
            if (urgentCases.length < 20) urgentCases.push(row);
          } else if (isToday(proxDateStart)) {
            todayContact++;
            if (urgentCases.length < 20 && !urgentCases.includes(row)) urgentCases.push(row);
          }
        }
      }
    });

    return { overdueCount, todayContact, active, total: data.length, urgentCases, clientIdx, procIdx };
  }, [data, headers]);

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Calculando estatísticas da base...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-zinc-50/30 overflow-y-auto h-full">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Resumo Operacional</h2>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Baseado na Coluna Próximo (Coluna N)</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-600 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Atrasados (Próximo &lt; Hoje)</p>
                <p className="text-4xl font-black text-red-600 tabular-nums">{stats.overdueCount}</p>
              </div>
              <div className="bg-red-50 p-2 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Pendências para Hoje</p>
                <p className="text-4xl font-black text-amber-500 tabular-nums">{stats.todayContact}</p>
              </div>
              <div className="bg-amber-50 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Carteira Ativa</p>
                <p className="text-4xl font-black text-blue-600 tabular-nums">{stats.active}</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <Card className="lg:col-span-2 shadow-sm border-none bg-white overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest">Casos que Requerem Atenção</h3>
            <Badge variant="destructive" className="text-[9px]">AÇÃO PRIORITÁRIA</Badge>
          </div>
          <div className="divide-y divide-zinc-50 max-h-[600px] overflow-y-auto">
            {stats.urgentCases.map((row, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate uppercase">
                      {String(row[`col_${stats.clientIdx}`] || "Cliente").toUpperCase()}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase truncate">
                      PROCESSO: {String(row[`col_${stats.procIdx}`] || "--")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => onWhatsApp(row, headers)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-2" /> WHATSAPP
                  </Button>
                  <Button size="sm" className="h-8 text-[10px] font-bold bg-zinc-900" onClick={() => onReschedule(row)}>
                    REAGENDAR
                  </Button>
                </div>
              </div>
            ))}
            {stats.urgentCases.length === 0 && (
              <div className="p-20 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                <p className="text-xs font-black uppercase text-zinc-400">Nenhuma urgência detectada na base!</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="shadow-sm border-none bg-zinc-900 text-white h-fit">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Estatísticas Rápidas</p>
              <h3 className="text-lg font-black uppercase leading-tight">Métricas da Planilha</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-zinc-400">Total de Registros</span>
                <span className="text-sm font-black">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-zinc-400">Carteira Ativa</span>
                <span className="text-sm font-black text-blue-400">{stats.active}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-zinc-400">Status Operacional</span>
                <span className="text-sm font-black text-green-400">SINCRONIZADO</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
